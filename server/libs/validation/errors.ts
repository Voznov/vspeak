import type { z } from 'zod';

export const formatZodIssues = (issues: z.core.$ZodIssue[]): string[] =>
  issues.map((issue) => {
    const path = issue.path.map((seg, i) => (i === 0 ? String(seg) : typeof seg === 'number' ? `[${seg}]` : `.${String(seg)}`)).join('');

    return path ? `${path}: ${issue.message}` : issue.message;
  });
