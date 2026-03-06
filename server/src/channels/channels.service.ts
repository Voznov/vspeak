import { HttpException, HttpStatus, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ChannelId, ChannelWithUsers, UserId, UserWithStatus } from '../../../libs/api/entities';
import { AuthService } from '../auth/auth.service';
import { WebRTCService } from '../webrtc/webrtc.service';
import { WsGateway } from '../ws/ws.gateway';
import { ChannelsRepo } from './channels.repo';

type ChannelRuntime = {
  userIds: Set<UserId>;
};

@Injectable()
export class ChannelsService implements OnModuleInit {
  private readonly runtime = new Map<ChannelId, ChannelRuntime>();

  constructor(
    private readonly repo: ChannelsRepo,
    private readonly webrtcService: WebRTCService,
    private readonly authService: AuthService,
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
        void this.leaveChannel(userId, channelId);
      }
    });
  }

  async createChannel(name: string): Promise<ChannelWithUsers> {
    const entity = await this.repo.createChannel(name);

    await this.webrtcService.createChannelRouter(entity.id);
    this.runtime.set(entity.id, { userIds: new Set() });

    const channel: ChannelWithUsers = { id: entity.id, name: entity.name, users: [] };
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
      this.webrtcService.closeTransports(userId);
    }

    await this.webrtcService.deleteChannelRouter(channelId);
    this.runtime.delete(channelId);
    await this.repo.deleteChannel(channelId);
    this.wsGateway.emitToAll('channelDeleted', { channelId });
  }

  async listChannels(): Promise<ChannelWithUsers[]> {
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

    // If the user is already connected somewhere, disconnect them first
    const currentChannelId = this.findUserChannelId(userId);
    if (currentChannelId) {
      await this.leaveChannel(userId, currentChannelId);
    }

    // Create WebRTC transports with a disconnect callback
    const transports = await this.webrtcService.createTransports(userId, channelId, () => {
      this.onUserDisconnected(userId, channelId);
    });

    // Add the user to the channel
    rt.userIds.add(userId);

    const user = await this.authService.getUser(userId);
    if (user) {
      this.wsGateway.emitToAll('channelUserJoined', {
        channelId,
        user: { ...user, hasMic: false, hasVideo: false, hasScreen: false, isDeaf: false },
      });
    }

    const channel = await this.repo.getChannelById(channelId);

    return {
      channel: {
        id: channelId,
        name: channel!.name,
        users: await this.getChannelUsers(channelId),
      },
      ...transports,
    };
  }

  async leaveChannel(userId: UserId, channelId: ChannelId): Promise<void> {
    const rt = this.runtime.get(channelId);
    if (!rt) {
      return;
    }

    // Close WebRTC resources (will trigger the onUserDisconnected callback)
    this.webrtcService.closeTransports(userId);
  }

  // Called when a transport closes (for any reason); idempotent — safe to call multiple times
  private onUserDisconnected(userId: UserId, channelId: ChannelId): void {
    const rt = this.runtime.get(channelId);
    if (rt && rt.userIds.has(userId)) {
      rt.userIds.delete(userId);
      this.wsGateway.emitToAll('channelUserLeft', { channelId, userId });
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

  async getChannelUsers(channelId: ChannelId): Promise<UserWithStatus[]> {
    const rt = this.runtime.get(channelId);
    if (!rt) {
      return [];
    }

    return Promise.all(
      [...rt.userIds].map(async (userId) => {
        const user = await this.authService.getUser(userId);
        if (!user) {
          throw new Error(`User ${userId} not found`);
        }

        return { ...user, ...this.webrtcService.getUserMediaStatus(userId) };
      }),
    );
  }
}
