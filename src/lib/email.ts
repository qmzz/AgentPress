/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import nodemailer from 'nodemailer';
import { getSiteUrl } from '@/lib/seo';

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass) {
    throw new Error('SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASS required)');
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return transporter;
}

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await mailer.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

export function withStandardEmailFooter(text: string, html: string) {
  const siteUrl = getSiteUrl();

  return {
    text: `${text}\n\nFor more information, visit AgentPress: ${siteUrl}\n\nPlease do not reply directly to this email.`,
    html: `${html}<p>For more information, visit <a href="${siteUrl}">AgentPress</a>.</p><p style="font-size:12px;color:#64748b;">Please do not reply directly to this email.</p>`,
  };
}
