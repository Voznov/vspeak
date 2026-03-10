import { HttpException, HttpStatus, Injectable, type OnModuleInit } from '@nestjs/common';
import { ChannelsRepo } from './channels.repo';
import type { ChannelId, UserId } from '../../../libs/api/entities';
import { ChannelWithUsersDto, UserWithStatusDto } from '../shared.dto';
import { UserService } from '../user/user.service';
// eslint-disable-next-line import-x/no-cycle
import { WebRTCService } from '../webrtc/webrtc.service';
import { WsGateway } from '../ws/ws.gateway';

type ChannelRuntime = {
  userIds: Set<UserId>;
};

const RECONNECT_GRACE_MS = 5_000;

@Injectable()
export class ChannelsService implements OnModuleInit {
  private readonly runtime = new Map<ChannelId, ChannelRuntime>();
  private readonly disconnectTimers = new Map<UserId, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly repo: ChannelsRepo,
    private readonly webrtcService: WebRTCService,
    private readonly userService: UserService,
    private readonly wsGateway: WsGateway,
  ) {}

  async onModuleInit() {
    // Restore runtime state for channels already in DB
    const channels = await this.repo.listChannels();
    for (const ch of channels) {
      await this.webrtcService.createChannelRouter(ch.id);
      this.runtime.set(ch.id, { userIds: new Set() });
    }

    this.wsGateway.onUserDisconnect((userId) => {
      const channelId = this.findUserChannelId(userId);
      if (channelId) {
        this.setDisconnectTimer(userId, channelId);
      }
    });
  }

  async updateChannel(channelId: ChannelId, name: string): Promise<{ id: ChannelId; name: string }> {
    if (!this.runtime.has(channelId)) {
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    }

    const existing = await this.repo.getChannelByName(name);
    if (existing && existing.id !== channelId) {
      throw new HttpException('Channel name already taken', HttpStatus.CONFLICT);
    }

    const entity = await this.repo.updateChannel(channelId, name);
    const channel = { id: entity.id, name: entity.name };
    this.wsGateway.emitToAll('channelUpdated', { channel });

    return channel;
  }

  async createChannel(name: string): Promise<ChannelWithUsersDto> {
    const entity = await this.repo.createChannel(name);

    await this.webrtcService.createChannelRouter(entity.id);
    this.runtime.set(entity.id, { userIds: new Set() });

    const channel: ChannelWithUsersDto = { id: entity.id, name: entity.name, users: [] };
    this.wsGateway.emitToAll('channelCreated', { channel });

    return channel;
  }

  async deleteChannel(channelId: ChannelId): Promise<void> {
    const rt = this.runtime.get(channelId);
    if (!rt) {
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    }

    // Disconnect all users before deleting the channel
    for (const userId of rt.userIds) {
      this.cancelDisconnectTimer(userId);
      this.webrtcService.closeTransports(userId);
    }

    await this.webrtcService.deleteChannelRouter(channelId);
    this.runtime.delete(channelId);
    await this.repo.deleteChannel(channelId);
    this.wsGateway.emitToAll('channelDeleted', { channelId });
  }

  async listChannels(): Promise<ChannelWithUsersDto[]> {
    const channels = await this.repo.listChannels();

    return Promise.all(
      channels.map(async (ch) => ({
        id: ch.id,
        name: ch.name,
        users: await this.getChannelUsers(ch.id),
      })),
    );
  }

  async joinChannel(userId: UserId, channelId: ChannelId) {
    const rt = this.runtime.get(channelId);
    if (!rt) {
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    }

    const [user, channel] = await Promise.all([this.userService.getUser(userId), this.repo.getChannelById(channelId)]);
    if (!user) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    if (!channel) {
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    }

    // If the user is already connected somewhere, disconnect them first
    const previousChannelId = this.findUserChannelId(userId);
    if (previousChannelId && previousChannelId !== channelId) {
      await this.leaveChannel(userId, previousChannelId);
    }

    this.cancelDisconnectTimer(userId);

    // Add the user to the channel
    rt.userIds.add(userId);

    if (previousChannelId !== channelId) {
      this.wsGateway.emitToAll('channelUserJoined', {
        channelId,
        user: { ...user, isConnected: false, hasMic: false, isMuted: false, hasVideo: false, hasScreen: false, isDeaf: false },
      });
    }

    return {
      channel: {
        id: channelId,
        name: channel.name,
        users: await this.getChannelUsers(channelId),
      },
    };
  }

  async leaveChannel(userId: UserId, channelId: ChannelId): Promise<void> {
    const rt = this.runtime.get(channelId);
    if (!rt || !rt.userIds.has(userId)) {
      return;
    }

    this.cancelDisconnectTimer(userId);

    // Close WebRTC resources (will trigger the onUserDisconnected callback)
    this.webrtcService.closeTransports(userId);
  }

  // Called when a transport closes (for any reason); idempotent — safe to call multiple times
  public onUserDisconnected(userId: UserId, channelId: ChannelId): void {
    const rt = this.runtime.get(channelId);
    if (rt && rt.userIds.has(userId)) {
      rt.userIds.delete(userId);
      this.wsGateway.emitToAll('channelUserLeft', { channelId, userId });
    }
  }

  private setDisconnectTimer(userId: UserId, channelId: ChannelId): void {
    this.cancelDisconnectTimer(userId);
    this.disconnectTimers.set(
      userId,
      setTimeout(() => {
        this.disconnectTimers.delete(userId);
        void this.leaveChannel(userId, channelId);
      }, RECONNECT_GRACE_MS),
    );
    this.wsGateway.emitToAll('channelUserStatusChanged', {
      channelId,
      userId,
      status: { ...this.webrtcService.getUserMediaStatus(userId), isConnected: false },
    });
  }

  private cancelDisconnectTimer(userId: UserId): void {
    const timer = this.disconnectTimers.get(userId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(userId);
    }
  }

  private findUserChannelId(userId: UserId): ChannelId | undefined {
    for (const [channelId, rt] of this.runtime) {
      if (rt.userIds.has(userId)) {
        return channelId;
      }
    }

    return undefined;
  }

  async getChannelUsers(channelId: ChannelId): Promise<UserWithStatusDto[]> {
    const rt = this.runtime.get(channelId);
    if (!rt) {
      return [];
    }

    return Promise.all(
      [...rt.userIds].map(async (userId) => {
        const user = await this.userService.getUser(userId);
        if (!user) {
          throw new Error(`User ${userId} not found`);
        }

        return { ...user, ...this.webrtcService.getUserMediaStatus(userId) };
      }),
    );
  }
}
