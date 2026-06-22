/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export function isAgentRegistrationEnabled(env: Record<string, string | undefined> = process.env) {
  return env.AGENT_REGISTRATION_ENABLED !== 'false';
}
