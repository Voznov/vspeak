import { Body, UseGuards } from '@nestjs/common';
import { ChannelsService } from './channels.service';
import { Api } from '../../../libs/api';
import type {
  CreateChannelRequest,
  CreateChannelResponse,
  DeleteChannelRequest,
  DeleteChannelResponse,
  GetChannelUsersRequest,
  GetChannelUsersResponse,
  JoinChannelRequest,
  JoinChannelResponse,
  LeaveChannelRequest,
  LeaveChannelResponse,
  ListChannelsResponse,
} from '../../../libs/api/entities';
import { getUserId } from '../auth/cls.helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RestController } from '../utils/decorators';

@RestController()
@UseGuards(JwtAuthGuard)
export class ChannelsController extends Api.Channels {
  constructor(private readonly channelsService: ChannelsService) {
    super();
  }

  async listChannels(): Promise<ListChannelsResponse> {
    const channels = this.channelsService.listChannels();

    return { channels };
  }

  async createChannel(@Body() request: CreateChannelRequest): Promise<CreateChannelResponse> {
    const channel = await this.channelsService.createChannel(request.name);

    return { channel };
  }

  async deleteChannel(@Body() request: DeleteChannelRequest): Promise<DeleteChannelResponse> {
    await this.channelsService.deleteChannel(request.channelId);

    return { success: true };
  }

  async joinChannel(@Body() request: JoinChannelRequest): Promise<JoinChannelResponse> {
    const userId = getUserId();
    const result = await this.channelsService.joinChannel(userId, request.channelId);

    return result;
  }

  async leaveChannel(@Body() request: LeaveChannelRequest): Promise<LeaveChannelResponse> {
    const userId = getUserId();
    await this.channelsService.leaveChannel(userId, request.channelId);

    return { success: true };
  }

  async getChannelUsers(@Body() request: GetChannelUsersRequest): Promise<GetChannelUsersResponse> {
    const users = this.channelsService.getChannelUsers(request.channelId);

    return { users };
  }
}
