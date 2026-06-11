/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export type DatabaseRuntimeConfig = {
  poolMax: number;
  idleTimeoutSeconds: number;
  connectTimeoutSeconds: number;
};

export function getDatabaseRuntimeConfig(env: Record<string, string | undefined> = process.env): DatabaseRuntimeConfig {
  return {
    poolMax: readPositiveInteger(env.DATABASE_POOL_MAX, 10),
    idleTimeoutSeconds: readPositiveInteger(env.DATABASE_IDLE_TIMEOUT_SECONDS, 30),
    connectTimeoutSeconds: readPositiveInteger(env.DATABASE_CONNECT_TIMEOUT_SECONDS, 3),
  };
}

export function getDatabaseClientOptions(overrides: Partial<DatabaseRuntimeConfig> = {}) {
  const config = { ...getDatabaseRuntimeConfig(), ...overrides };
  return {
    max: config.poolMax,
    idle_timeout: config.idleTimeoutSeconds,
    connect_timeout: config.connectTimeoutSeconds,
  };
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
