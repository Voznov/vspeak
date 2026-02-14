import { Body, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { getUserId } from './cls.helper';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Api } from '../../../libs/api';
import { type AdminLoginRequest, type AdminLoginResponse, type GetMeResponse, type LoginRequest, type LoginResponse } from '../../../libs/api/entities';
import { ENV } from '../env';
import { RestController } from '../utils/decorators';

@RestController()
export class AuthController extends Api.Auth {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async login(@Body() request: LoginRequest): Promise<LoginResponse> {
    const { nickname } = request;

    // Check if nickname is already taken
    const existingUser = this.authService.getUserByNickname(nickname);
    if (existingUser) {
      throw new HttpException('Nickname already taken', HttpStatus.CONFLICT);
    }

    // Create new user
    const user = this.authService.createUser(nickname, 'user');
    const token = this.authService.generateToken(user.id);

    return { token, user };
  }

  async adminLogin(@Body() request: AdminLoginRequest): Promise<AdminLoginResponse> {
    const { nickname, adminKey } = request;

    // Verify admin key
    if (adminKey !== ENV.ADMIN_KEY) {
      throw new HttpException('Invalid admin key', HttpStatus.FORBIDDEN);
    }

    // Check if nickname is already taken
    const existingUser = this.authService.getUserByNickname(nickname);
    if (existingUser) {
      throw new HttpException('Nickname already taken', HttpStatus.CONFLICT);
    }

    // Create new admin user
    const user = this.authService.createUser(nickname, 'admin');
    const token = this.authService.generateToken(user.id);

    return { token, user };
  }

  @UseGuards(JwtAuthGuard)
  async getMe(): Promise<GetMeResponse> {
    const userId = getUserId();
    const user = this.authService.getUser(userId);

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return { user };
  }
}
