import { z } from 'zod';

export function getZodFieldErrors<T extends Record<string, unknown>>(
  error: z.ZodError<T>
): Partial<Record<keyof T, string>> {
  return error.issues.reduce((acc, issue) => {
    const campo = issue.path[0] as keyof T | undefined;

    if (campo && !acc[campo]) {
      acc[campo] = issue.message;
    }

    return acc;
  }, {} as Partial<Record<keyof T, string>>);
}