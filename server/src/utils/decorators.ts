import { applyDecorators, Controller, Post, type Type } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { dash, title } from 'radash';

export const RestController = (prefix?: string) => Controller(prefix ?? '');

export const Rest =
  (options: { response: Type }): MethodDecorator =>
  (target, propertyKey, descriptor) => {
    const method = String(propertyKey);
    applyDecorators(Post(dash(method)), ApiOperation({ operationId: method, summary: title(dash(method)) }), ApiOkResponse({ type: options.response }))(
      target,
      propertyKey,
      descriptor,
    );
  };
