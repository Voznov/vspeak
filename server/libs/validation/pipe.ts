import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { isZodDtoClass, toDto } from './zod-dto';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, { metatype }: ArgumentMetadata): unknown {
    if (!metatype || !isZodDtoClass(metatype)) {
      return value;
    }

    return toDto(metatype, value);
  }
}
