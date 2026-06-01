import { NextRequest } from 'next/server';

export function isAdminRequest(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  const headerSecret = request.headers.get('x-admin-secret');
  if (headerSecret && headerSecret === secret) return true;

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) === secret) return true;

  return false;
}
