import { applyDecorators, Controller, Post } from '@nestjs/common';
import { dash } from 'radash';
import { getMethods } from './object';

export const RestController = () =>
  applyDecorators(Controller(), (target: Function): void => {
    getMethods(target).forEach((method) => {
      Reflect.decorate([Post(dash(method))], target.prototype, method, Reflect.getOwnPropertyDescriptor(target.prototype, method));
    });
  });
