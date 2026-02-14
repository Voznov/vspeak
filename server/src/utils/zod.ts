import { z } from 'zod';

export const zNumberFromString = z.union([z.number(), z.string()]).transform((val, ctx) => {
  const num = Number(val);
  if (Number.isNaN(num)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected a number or numeric string, but got: "${val}" (type: ${typeof val})`,
    });

    return z.NEVER;
  }

  return num;
});

export const zIntFromString = zNumberFromString.pipe(z.number().int());

export const zPort = zIntFromString.pipe(z.number().min(1).max(65535));

export const zBooleanFromString = z.union([z.literal('true'), z.literal('false'), z.boolean()]).transform((val) => val === true || val === 'true');
