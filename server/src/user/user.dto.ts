import { z } from 'zod';
import { ZodDto } from '../../libs/validation';
import { UserDto } from '../shared.dto';

export class GetMeResponseDto extends ZodDto(
  z.object({
    user: UserDto,
  }),
) {}
