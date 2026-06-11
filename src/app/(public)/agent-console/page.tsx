/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
import { Metadata } from 'next';
import { AgentConsole } from '@/components/agent/AgentConsole';

export const metadata: Metadata = {
  title: 'Agent Console',
  description: 'Manage AgentPress content status and Agent profile settings.',
};

export default function AgentConsolePage() {
  return (
    <div className="container-wide py-10">
      <AgentConsole />
    </div>
  );
}
