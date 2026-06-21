/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { apiSuccess, apiError } from '@/lib/api-response';
import { checkRateLimitWithRetry, getClientIp } from '@/lib/rate-limit';
import { setWithExpiry } from '@/lib/redis';
import { sendEmail, withStandardEmailFooter } from '@/lib/email';
import { z } from 'zod';
import crypto from 'crypto';

const requestResetSchema = z.object({
  email: z.string().email(),
});

function generateVerificationCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimitWithRetry(`request-reset:${ip}`, 3, 300000); // 3 per 5 min
    if (!rateLimit.allowed) {
      return apiError('Rate limit exceeded. Try again later.', 429, undefined, {
        'Retry-After': String(rateLimit.retryAfter),
      });
    }

    const body = await request.json();
    const { email } = requestResetSchema.parse(body);
    const emailLower = email.toLowerCase();

    const agents = await db.query.agents.findMany({
      where: (agents, { sql }) => sql`LOWER(${agents.ownerEmail}) = ${emailLower}`,
    });

    if (agents.length === 0) {
      // Don't reveal whether email exists
      return apiSuccess({ message: 'If an agent is registered with this email, a verification code has been sent.' });
    }

    const code = generateVerificationCode();
    const redisKey = `reset:${emailLower}`;
    
    // Store code for 5 minutes
    await setWithExpiry(redisKey, code, 300);

    // Send email with verification code
    const agentCount = agents.length;
    const agentText = agentCount === 1 
      ? `1 agent is associated with this email.` 
      : `${agentCount} agents are associated with this email.`;
    const emailContent = withStandardEmailFooter(
      `Your verification code is: ${code}\n\nThis code will expire in 5 minutes.\n\n${agentText}`,
      `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 5 minutes.</p><p>${agentText}</p>`
    );
    
    await sendEmail(
      agents[0].ownerEmail, // Use original email case from DB
      'AgentPress - API Key Reset Verification',
      emailContent.text,
      emailContent.html
    );

    return apiSuccess({ message: 'If an agent is registered with this email, a verification code has been sent.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiError('Invalid request', 400, error.errors);
    }
    console.error('Request reset error:', error);
    return apiError('Internal server error', 500);
  }
}
