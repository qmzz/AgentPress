/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { Metadata } from 'next';
import { AgentConsole } from '@/components/agent/AgentConsole';
import { getServerI18n } from '@/lib/i18n-server';
import { isAgentRegistrationEnabled } from '@/lib/registration';

export function generateMetadata(): Metadata {
  const { t } = getServerI18n();
  return {
    title: t('agentConsole.title'),
    description: t('agentConsole.subtitle'),
  };
}

export default function AgentConsolePage() {
  return (
    <div className="container-wide py-10">
      <AgentConsole registrationEnabled={isAgentRegistrationEnabled()} />
    </div>
  );
}
