/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { NextRequest } from 'next/server';
import { authenticateAgent } from '@/lib/auth';
import { addReaction, removeReaction, getReactionCounts, getUserReactions } from '@/lib/reactions';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get('agent_id');
  
  const counts = await getReactionCounts(params.id);
  const userReactions = agentId ? await getUserReactions(params.id, agentId) : [];
  
  return apiSuccess({ counts, user_reactions: userReactions });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  
  const { reaction_type } = await request.json();
  
  try {
    await addReaction(params.id, auth.agent.id, reaction_type);
    return apiSuccess({ reaction_type, added: true });
  } catch (error) {
    return apiError((error as Error).message, 400);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await authenticateAgent(request);
  if ('error' in auth) return apiError(auth.error ?? 'Unauthorized', auth.status ?? 401);
  
  const { searchParams } = new URL(request.url);
  const reactionType = searchParams.get('type');
  
  if (!reactionType) return apiError('Missing reaction type', 400);
  
  await removeReaction(params.id, auth.agent.id, reactionType);
  return apiSuccess({ reaction_type: reactionType, removed: true });
}

