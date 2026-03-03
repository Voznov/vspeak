import { Body, UseGuards } from '@nestjs/common';
import {
  CreateChannelRequestDto,
  CreateChannelResponseDto,
  DeleteChannelRequestDto,
  DeleteChannelResponseDto,
  GetChannelUsersRequestDto,
  GetChannelUsersResponseDto,
  JoinChannelRequestDto,
  JoinChannelResponseDto,
  LeaveChannelRequestDto,
  LeaveChannelResponseDto,
  ListChannelsResponseDto,
} from './channels.dto';
import { ChannelsService } from './channels.service';
import { Api } from '../../../libs/api';
import { getUserId } from '../auth/cls.helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Rest, RestController } from '../utils/decorators';

@RestController()
@UseGuards(JwtAuthGuard)
export class ChannelsController extends Api.Channels {
  constructor(private readonly channelsService: ChannelsService) {
    super();
  }

  @Rest({ response: ListChannelsResponseDto })
  async listChannels(): Promise<ListChannelsResponseDto> {
    const channels = this.channelsService.listChannels();

    return { channels };
  }

  @Rest({ response: CreateChannelResponseDto })
  async createChannel(@Body() request: CreateChannelRequestDto): Promise<CreateChannelResponseDto> {
    const channel = await this.channelsService.createChannel(request.name);

    return { channel };
  }

  @Rest({ response: DeleteChannelResponseDto })
  async deleteChannel(@Body() request: DeleteChannelRequestDto): Promise<DeleteChannelResponseDto> {
    await this.channelsService.deleteChannel(request.channelId);

    return { success: true };
  }

  @Rest({ response: JoinChannelResponseDto })
  async joinChannel(@Body() request: JoinChannelRequestDto): Promise<JoinChannelResponseDto> {
    const userId = getUserId();
    const result = await this.channelsService.joinChannel(userId, request.channelId);

    return result;
  }

  @Rest({ response: LeaveChannelResponseDto })
  async leaveChannel(@Body() request: LeaveChannelRequestDto): Promise<LeaveChannelResponseDto> {
    const userId = getUserId();
    await this.channelsService.leaveChannel(userId, request.channelId);

    return { success: true };
  }

  @Rest({ response: GetChannelUsersResponseDto })
  async getChannelUsers(@Body() request: GetChannelUsersRequestDto): Promise<GetChannelUsersResponseDto> {
    const users = this.channelsService.getChannelUsers(request.channelId);

    return { users };
  }
}
