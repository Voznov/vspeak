import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { GetMeResponseDto } from './user.dto';
import { UserService } from './user.service';
import { Api } from '../../../libs/api';
import { getUserId } from '../auth/cls.helper';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Rest, RestController } from '../utils/decorators';

@RestController('user')
export class UserController extends Api.User {
  constructor(private readonly userService: UserService) {
    super();
  }

  @Rest({ response: GetMeResponseDto })
  @UseGuards(JwtAuthGuard)
  async getMe(): Promise<GetMeResponseDto> {
    const userId = getUserId();
    const user = await this.userService.getUser(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return { user };
  }
}
