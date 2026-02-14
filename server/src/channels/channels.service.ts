import { randomUUID } from 'crypto';
import { HttpException, HttpStatus, Injectable, type OnModuleInit } from '@nestjs/common';
import type { ChannelId, ChannelWithUsers, User, UserId } from '../../../libs/api/entities';
import { AuthService } from '../auth/auth.service';
import { WebRTCService } from '../webrtc/webrtc.service';
import { WsGateway } from '../ws/ws.gateway';

type ChannelData = {
  id: ChannelId;
  name: string;
  userIds: Set<UserId>;
};

@Injectable()
export class ChannelsService implements OnModuleInit {
  private readonly channels = new Map<ChannelId, ChannelData>();

  constructor(
    private readonly webrtcService: WebRTCService,
    private readonly authService: AuthService,
    private readonly wsGateway: WsGateway,
  ) {}

  async onModuleInit() {
    this.wsGateway.onUserDisconnect((userId) => {
      const channel = this.findUserChannel(userId);
      if (channel) {
        void this.leaveChannel(userId, channel.id);
      }
    });
  }

  async createChannel(name: string): Promise<ChannelWithUsers> {
    const channelId = randomUUID() as ChannelId;
    const channelData: ChannelData = { id: channelId, name, userIds: new Set() };

    // Create a WebRTC router for the channel (with default codecs)
    await this.webrtcService.createChannelRouter(channelId);
    this.channels.set(channelId, channelData);

    const channel: ChannelWithUsers = { id: channelId, name, users: [] };
    this.wsGateway.emitToAll('channelCreated', { channel });

    return channel;
  }

  async deleteChannel(channelId: ChannelId): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    }

    // Disconnect all users before deleting the channel
    const userIds = Array.from(channel.userIds);
    for (const userId of userIds) {
      this.webrtcService.closeTransports(userId);
      // closeTransports will trigger the onUserDisconnected callback
    }

    // Delete the WebRTC router
    await this.webrtcService.deleteChannelRouter(channelId);
    this.channels.delete(channelId);
    this.wsGateway.emitToAll('channelDeleted', { channelId });
  }

  listChannels(): ChannelWithUsers[] {
    return Array.from(this.channels.values()).map((ch) => ({
      id: ch.id,
      name: ch.name,
      users: this.getChannelUsers(ch.id),
    }));
  }

  async joinChannel(userId: UserId, channelId: ChannelId) {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    }

    // If the user is already connected somewhere, disconnect them first
    const currentChannel = this.findUserChannel(userId);
    if (currentChannel) {
      await this.leaveChannel(userId, currentChannel.id);
    }

    // Create WebRTC transports with a disconnect callback
    const transports = await this.webrtcService.createTransports(userId, channelId, () => {
      this.onUserDisconnected(userId, channelId);
    });

    // Add the user to the channel
    channel.userIds.add(userId);

    const user = this.authService.getUser(userId);
    if (user) {
      this.wsGateway.emitToAll('channelUserJoined', { channelId, user });
    }

    return {
      channel: this.getChannelWithUsers(channelId),
      send: transports.send,
      recv: transports.recv,
    };
  }

  async leaveChannel(userId: UserId, channelId: ChannelId): Promise<void> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return;
    }

    // Close WebRTC resources (will trigger the onUserDisconnected callback)
    this.webrtcService.closeTransports(userId);
  }

  // Called when a transport closes (for any reason); idempotent — safe to call multiple times
  private onUserDisconnected(userId: UserId, channelId: ChannelId): void {
    const channel = this.channels.get(channelId);
    if (channel && channel.userIds.has(userId)) {
      channel.userIds.delete(userId);
      this.wsGateway.emitToAll('channelUserLeft', { channelId, userId });
    }
  }

  private findUserChannel(userId: UserId): ChannelData | undefined {
    for (const channel of this.channels.values()) {
      if (channel.userIds.has(userId)) {
        return channel;
      }
    }

    return undefined;
  }

  getChannelUsers(channelId: ChannelId): User[] {
    const channel = this.channels.get(channelId);
    if (!channel) {
      return [];
    }

    return [...channel.userIds].map((userId) => {
      const user = this.authService.getUser(userId);
      if (!user) {
        throw new Error(`User ${userId} not found`);
      }

      return user;
    });
  }

  private getChannelWithUsers(channelId: ChannelId): ChannelWithUsers {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new HttpException('Channel not found', HttpStatus.NOT_FOUND);
    }

    return {
      id: channel.id,
      name: channel.name,
      users: this.getChannelUsers(channelId),
    };
  }
}
