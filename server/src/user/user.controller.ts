import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { ConfirmAvatarUploadResponseDto, GetMeResponseDto, UpdateAvatarResponseDto } from './user.dto';
import { UserService } from './user.service';
import { Api } from '../../../libs/api';
import { getUserId } from '../auth/cls.helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Rest, RestController } from '../utils/decorators';
import { WsGateway } from '../ws/ws.gateway';

@RestController('user')
@UseGuards(JwtAuthGuard)
export class UserController extends Api.User {
  constructor(
    private readonly userService: UserService,
    private readonly wsGateway: WsGateway,
  ) {
    super();
  }

  @Rest({ response: GetMeResponseDto })
  async getMe(): Promise<GetMeResponseDto> {
    const userId = getUserId();
    const user = await this.userService.getUser(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return { user };
  }

  @Rest({ response: UpdateAvatarResponseDto })
  async updateAvatar(): Promise<UpdateAvatarResponseDto> {
    const userId = getUserId();
    const uploadUrl = await this.userService.getAvatarUploadUrl(userId);

    return { uploadUrl };
  }

  @Rest({ response: ConfirmAvatarUploadResponseDto })
  async confirmAvatarUpload(): Promise<ConfirmAvatarUploadResponseDto> {
    const userId = getUserId();
    const user = await this.userService.getUser(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    this.wsGateway.emitToAll('userUpdated', { user });

    return { user };
  }
}
