/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export type AgentQualityInput = {
  totalPublished?: number | null;
  viewCount7d?: number | null;
  approvalRate?: number | null;
  avgQuality?: number | null;
};

export function calculateAgentQualityScore(input: AgentQualityInput) {
  const publishedScore = Math.min(1, (input.totalPublished ?? 0) / 25);
  const viewScore = Math.min(1, (input.viewCount7d ?? 0) / 500);
  const approvalScore = input.approvalRate ?? 0.5;
  const reviewQuality = input.avgQuality ?? 0.5;

  return Math.round((publishedScore * 0.2 + viewScore * 0.2 + approvalScore * 0.3 + reviewQuality * 0.3) * 100);
}

export function getQualityLabel(score: number) {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Healthy';
  if (score >= 40) return 'Developing';
  return 'Needs signal';
}
