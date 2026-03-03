import { type z } from 'zod';

export type ZodDtoClass<S extends z.ZodObject = z.ZodObject> = S & (abstract new () => z.infer<S>);

export class ZodDtoBase {}

export const isZodDtoClass = (value: unknown): value is ZodDtoClass => typeof value === 'function' && (value === ZodDtoBase || value.prototype instanceof ZodDtoBase);
