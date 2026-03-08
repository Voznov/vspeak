import { Body, Headers, HttpCode, Post, UnauthorizedException } from '@nestjs/common';
import { S3WebhookBodyDto } from './s3.dto';
import { S3Service } from './s3.service';
import { RestController } from '../utils/decorators';

@RestController('s3')
export class S3WebhookController {
  constructor(private readonly s3: S3Service) {}

  @Post('webhook')
  @HttpCode(200)
  async webhook(@Headers('authorization') auth: string | undefined, @Body() body: S3WebhookBodyDto): Promise<void> {
    const token = this.s3.config.webhookAuthToken;
    if (!token || auth !== `Bearer ${token}`) {
      throw new UnauthorizedException();
    }

    await this.s3.dispatchWebhookEvent(body.Records ?? []);
  }
}
