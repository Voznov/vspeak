import { Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { AdminLoginRequestDto, AdminLoginResponseDto, GetMeResponseDto, LoginRequestDto, LoginResponseDto } from './auth.dto';
import { AuthService } from './auth.service';
import { getUserId } from './cls.helper';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Api } from '../../../libs/api';
import { ENV } from '../env';
import { Rest, RestController } from '../utils/decorators';

@RestController()
export class AuthController extends Api.Auth {
  constructor(private readonly authService: AuthService) {
    super();
  }

  @Rest({ response: LoginResponseDto })
  async login(@Body() request: LoginRequestDto): Promise<LoginResponseDto> {
    const { nickname } = request;

    const existingUser = await this.authService.getUserByNickname(nickname);
    if (existingUser) {
      throw new HttpException('Nickname already taken', HttpStatus.CONFLICT);
    }

    const user = await this.authService.createUser(nickname, 'user');
    const token = this.authService.generateToken(user.id);

    return { token, user };
  }

  @Rest({ response: AdminLoginResponseDto })
  async adminLogin(@Body() request: AdminLoginRequestDto): Promise<AdminLoginResponseDto> {
    const { nickname, adminKey } = request;

    if (adminKey !== ENV.ADMIN_KEY) {
      throw new HttpException('Invalid admin key', HttpStatus.FORBIDDEN);
    }

    const existingUser = await this.authService.getUserByNickname(nickname);
    if (existingUser) {
      throw new HttpException('Nickname already taken', HttpStatus.CONFLICT);
    }

    const user = await this.authService.createUser(nickname, 'admin');
    const token = this.authService.generateToken(user.id);

    return { token, user };
  }

  @Rest({ response: GetMeResponseDto })
  @UseGuards(JwtAuthGuard)
  async getMe(): Promise<GetMeResponseDto> {
    const userId = getUserId();
    const user = await this.authService.getUser(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return { user };
  }
}
