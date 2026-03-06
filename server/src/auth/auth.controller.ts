import { Body, HttpException, HttpStatus } from '@nestjs/common';
import { AdminLoginRequestDto, AdminLoginResponseDto, LoginRequestDto, LoginResponseDto } from './auth.dto';
import { AuthService } from './auth.service';
import { Api } from '../../../libs/api';
import { ENV } from '../env';
import { UserService } from '../user/user.service';
import { Rest, RestController } from '../utils/decorators';

@RestController()
export class AuthController extends Api.Auth {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {
    super();
  }

  @Rest({ response: LoginResponseDto })
  async login(@Body() request: LoginRequestDto): Promise<LoginResponseDto> {
    const { nickname } = request;

    const existingUser = await this.userService.getUserByNickname(nickname);
    if (existingUser) {
      throw new HttpException('Nickname already taken', HttpStatus.CONFLICT);
    }

    const user = await this.userService.createUser(nickname, 'user');
    const token = this.authService.generateToken(user.id);

    return { token, user };
  }

  @Rest({ response: AdminLoginResponseDto })
  async adminLogin(@Body() request: AdminLoginRequestDto): Promise<AdminLoginResponseDto> {
    const { nickname, adminKey } = request;

    if (adminKey !== ENV.ADMIN_KEY) {
      throw new HttpException('Invalid admin key', HttpStatus.FORBIDDEN);
    }

    const existingUser = await this.userService.getUserByNickname(nickname);
    if (existingUser) {
      throw new HttpException('Nickname already taken', HttpStatus.CONFLICT);
    }

    const user = await this.userService.createUser(nickname, 'admin');
    const token = this.authService.generateToken(user.id);

    return { token, user };
  }
}
