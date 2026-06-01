export interface L2ReviewResult {
  passed: boolean;
  verdict: 'approved' | 'rejected' | 'flagged';
  score: {
    quality: number;
    toxicity: number;
    relevance: number;
    completeness: number;
  };
  reason?: string;
  reasons?: string[];
}

const TOXIC_PATTERNS = [
  /\b(hate|kill|bomb|terrorist)\b/i,
  /\b(racist|sexist|nazi)\b/i,
  /\b(scam|fraud|malware|phishing)\b/i,
];

const SPAM_PATTERNS = [
  /\b(?:buy now|click here|free money|guaranteed profit)\b/i,
  /(.)\1{8,}/,
];

export function reviewContentL2(input: { title: string; summary?: string | null; blocks: unknown[]; tags?: string[] | null }): L2ReviewResult {
  const reasons: string[] = [];
  const title = input.title.trim();
  const summary = (input.summary ?? '').trim();
  const blocks = input.blocks ?? [];
  const tags = input.tags ?? [];

  let quality = 0.85;
  let toxicity = 0.02;
  let relevance = 0.9;
  let completeness = 0.9;

  const textContent = [title, summary, JSON.stringify(blocks), tags.join(' ')].join('\n');

  for (const pattern of TOXIC_PATTERNS) {
    if (pattern.test(textContent)) {
      toxicity = Math.max(toxicity, 0.9);
      reasons.push('Possible toxic or harmful language detected');
      quality -= 0.25;
      relevance -= 0.1;
    }
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(textContent)) {
      quality -= 0.2;
      reasons.push('Spam-like or manipulative phrasing detected');
    }
  }

  if (title.length < 8) {
    reasons.push('Title is too short for publication quality');
    quality -= 0.15;
  }

  if (summary.length > 0 && summary.length < 30) {
    reasons.push('Summary is too short to be useful');
    completeness -= 0.1;
  }

  if (blocks.length === 0) {
    reasons.push('No content blocks provided');
    completeness = 0;
    quality = 0.1;
  }

  const textBlockCount = blocks.filter((block) => typeof block === 'object' && block !== null && (block as { type?: string }).type === 'text').length;
  const mediaBlockCount = blocks.filter((block) => typeof block === 'object' && block !== null && ['image', 'audio', 'video', 'chart'].includes((block as { type?: string }).type ?? '')).length;

  if (textBlockCount === 0 && mediaBlockCount > 0) {
    reasons.push('Media-heavy content should include explanatory text');
    relevance -= 0.2;
  }

  if (blocks.length > 12) {
    quality -= 0.1;
  }

  if (tags.length === 0) {
    reasons.push('Missing tags reduces discoverability');
    relevance -= 0.05;
  }

  quality = clamp(quality);
  toxicity = clamp(toxicity);
  relevance = clamp(relevance);
  completeness = clamp(completeness);

  const riskScore = toxicity * 0.5 + (1 - quality) * 0.3 + (1 - completeness) * 0.2;

  let verdict: L2ReviewResult['verdict'] = 'approved';
  if (toxicity >= 0.75 || riskScore >= 0.65) verdict = 'rejected';
  else if (quality < 0.7 || completeness < 0.7 || relevance < 0.75 || reasons.length > 0) verdict = 'flagged';

  return {
    passed: verdict === 'approved',
    verdict,
    score: { quality, toxicity, relevance, completeness },
    reason: reasons[0],
    reasons: reasons.length > 0 ? reasons : undefined,
  };
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))));
}
