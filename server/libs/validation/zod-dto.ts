import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { ZodDtoBase, type ZodDtoClass } from './base';
import { formatZodIssues } from './errors';
import { applySwaggerDecorators } from './swagger';
import { filterValues } from './utils';

export type { ZodDtoClass } from './base';
export { isZodDtoClass } from './base';

export interface ZodDtoOptions<T extends z.ZodRawShape> {
  aliases?: Record<string, keyof T & string>;
}

function makeAliasPreprocessor(aliases: Record<string, string>) {
  return (data: unknown): unknown => {
    if (typeof data !== 'object' || data === null) return data;
    const result = { ...data } as Record<string, unknown>;
    for (const [from, to] of Object.entries(aliases)) {
      if (from in result) {
        if (!(to in result)) {
          result[to] = result[from];
        }
        delete result[from];
      }
    }

    return result;
  };
}

export function ZodDto<T extends z.ZodRawShape>(objectSchema: z.ZodObject<T>, options?: ZodDtoOptions<T>): ZodDtoClass<z.ZodObject<T>> {
  const effectiveSchema = options?.aliases ? z.preprocess(makeAliasPreprocessor(options.aliases), objectSchema) : objectSchema;

  abstract class Dto extends ZodDtoBase {}

  const result = Dto as ZodDtoClass<z.ZodObject<T>>;
  const descriptors = Object.getOwnPropertyDescriptors(effectiveSchema);
  // 'prototype' is non-configurable on classes — skip it to avoid TypeError
  delete descriptors['prototype'];
  Object.defineProperties(result, descriptors);

  // Override Zod wrapper methods so they reference `result` (the DTO class) directly.
  // Without this, TestDto.optional() wraps effectiveSchema (the raw ZodObject), not TestDto,
  // so isZodDtoClass() misses the nested DTO during swagger generation.
  result.optional = function () {
    return z.optional(this);
  };
  result.nullable = function () {
    return z.nullable(this);
  };
  result.array = function () {
    return z.array(this);
  };

  // When aliases are used, effectiveSchema is a ZodEffects (z.preprocess) which lacks
  // ZodObject methods like .extend()/.omit()/.pick(). Override them to delegate to the
  // raw objectSchema so derived DTOs can be created without losing schema composition.
  result.extend = (augmentation) => ZodDto(objectSchema.extend(augmentation), options);
  result.omit = (mask) =>
    ZodDto(objectSchema.omit(mask), {
      ...options,
      aliases: filterValues(options?.aliases ?? {}, (key): key is Exclude<keyof T, Extract<keyof T, keyof typeof mask>> & string => !(key in mask)),
    });
  result.pick = (mask) =>
    ZodDto(objectSchema.pick(mask), {
      ...options,
      aliases: filterValues(options?.aliases ?? {}, (key): key is Extract<keyof T, keyof typeof mask> & string => key in mask),
    });

  applySwaggerDecorators(result);

  return result;
}

export function toDto<T extends Omit<ZodDtoClass, 'check'> & (new () => object)>(DtoClass: T, data: unknown[]): InstanceType<T>[];
export function toDto<T extends Omit<ZodDtoClass, 'check'> & (new () => object)>(DtoClass: T, data: unknown): InstanceType<T>;
export function toDto<T extends Omit<ZodDtoClass, 'check'> & (new () => object)>(DtoClass: T, data: unknown | unknown[]): InstanceType<T> | InstanceType<T>[] {
  const isArray = Array.isArray(data);
  const items = isArray ? data : [data];

  const results = items.map((item) => {
    const result = DtoClass.safeParse(item);
    if (!result.success) {
      throw new BadRequestException(formatZodIssues(result.error.issues));
    }

    return Object.assign(new DtoClass(), result.data) as InstanceType<T>;
  });

  return isArray ? results : results[0];
}
