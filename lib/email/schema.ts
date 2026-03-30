import { z } from 'zod';

export const DEFAULT_FOLLOW_UPS = 2;
export const MAX_FOLLOW_UPS = 2;

export type EmailGenerationResult = {
  subject: string;
  body1: string;
  body2?: string;
  body3?: string;
};

export function createEmailGenerationSchema(numberOfFollowUps?: number) {
  const count = Math.min(
    Math.max(numberOfFollowUps ?? DEFAULT_FOLLOW_UPS, 0),
    MAX_FOLLOW_UPS,
  );

  const bodyDescription = (n: number) =>
    `Email ${n} body - plain HTML using <p> tags for paragraph spacing, no inline styles`;

  const schemaShape: Record<string, z.ZodString> = {
    subject: z.string().describe('Email subject line - concise and engaging'),
    body1: z.string().describe(bodyDescription(1)),
  };

  for (let i = 2; i <= count + 1; i++) {
    schemaShape[`body${i}`] = z.string().describe(bodyDescription(i));
  }

  return z.object(schemaShape);
}
