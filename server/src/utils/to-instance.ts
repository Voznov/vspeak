import { toDto } from '@voznov/zod-dto';
import { camel, mapEntries } from 'radash';

const camelizeKeys = (input: unknown): unknown => {
  if (Array.isArray(input)) return input.map(camelizeKeys);
  if (typeof input === 'object' && input !== null && Object.getPrototypeOf(input) === Object.prototype) {
    return mapEntries(input, (key, value) => [camel(key), camelizeKeys(value)]);
  }

  return input;
};

export const toInstance: typeof toDto = (cls, data) => toDto(cls, camelizeKeys(data));
