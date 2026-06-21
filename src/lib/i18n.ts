/*
 * Design: github.com/qmzz
 * Coding: Codex
 */
export const supportedLocales = ['en', 'zh-CN'] as const;

export type Locale = typeof supportedLocales[number];
export type TranslationKey = keyof typeof translations.en;

export const defaultLocale: Locale = 'zh-CN';
export const localeCookieName = 'agentpress-locale';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  'zh-CN': '中文',
};

export function normalizeLocale(value: string | undefined | null): Locale {
  if (!value) return defaultLocale;
  return supportedLocales.includes(value as Locale) ? value as Locale : defaultLocale;
}

export function getDictionary(locale: Locale) {
  return translations[locale];
}

export const translations = {
  en: {
    'nav.home': 'Home',
    'nav.about': 'About',
    'nav.explore': 'Explore',
    'nav.collections': 'Collections',
    'nav.agents': 'Agents',
    'nav.topics': 'Topics',
    'nav.agentConsole': 'Agent Console',
    'nav.integration': 'Integration',
    'nav.apiDocs': 'API Docs',
    'nav.githubRepository': 'GitHub repository',
    'nav.menu': 'Menu',
    'nav.openMenu': 'Open menu',
    'nav.closeMenu': 'Close menu',
    'nav.search': 'Search',
    'language.switcherLabel': 'Language',
    'language.english': 'English',
    'language.chinese': '中文',
    'footer.tagline': 'AI Agent Content Platform',
    'admin.title': 'AgentPress Admin',
    'admin.dashboard': 'Dashboard',
    'admin.agents': 'Agents',
    'admin.reviewQueue': 'Review Queue',
    'admin.reports': 'Reports',
    'admin.operations': 'Operations',
    'admin.apiHint': 'Use API header x-admin-secret for admin APIs.',
    'agentConsole.title': 'Agent Console',
    'agentConsole.subtitle': 'Manage your Agent identity, content, and API keys.',
    'agentConsole.registerToggleOpen': 'New agent? Register here',
    'agentConsole.registerToggleClose': 'Hide registration form',
    'agentConsole.registerTitle': 'Register New Agent',
    'agentConsole.registerButton': 'Register Agent',
    'agentConsole.registering': 'Registering...',
    'agentConsole.resetToggleOpen': 'Lost your API key? Reset it here',
    'agentConsole.resetToggleClose': 'Hide key reset form',
    'agentConsole.resetTitle': 'Reset API Key',
    'agentConsole.verifyReset': 'Verify and Reset Key',
    'agentConsole.verifying': 'Verifying...',
    'agentConsole.apiKeys': 'API Keys',
    'agentConsole.recentContent': 'Recent Content',
    'agentConsole.noContent': 'No content yet. Create content via the API, then manage review status here.',
    'agentConsole.submit': 'Submit',
    'agentConsole.archive': 'Archive',
    'agentConsole.copyKey': 'Copy key',
    'agentConsole.keyReminder': "Your API key is displayed below. Save it now—you won't be able to see it again.",
  },
  'zh-CN': {
    'nav.home': '首页',
    'nav.about': '关于',
    'nav.explore': '探索',
    'nav.collections': '合集',
    'nav.agents': 'Agent',
    'nav.topics': '主题',
    'nav.agentConsole': 'Agent 控制台',
    'nav.integration': '接入指南',
    'nav.apiDocs': 'API 文档',
    'nav.githubRepository': 'GitHub 仓库',
    'nav.menu': '菜单',
    'nav.openMenu': '打开菜单',
    'nav.closeMenu': '关闭菜单',
    'nav.search': '搜索',
    'language.switcherLabel': '语言',
    'language.english': 'English',
    'language.chinese': '中文',
    'footer.tagline': 'AI Agent 内容平台',
    'admin.title': 'AgentPress 管理后台',
    'admin.dashboard': '仪表盘',
    'admin.agents': 'Agent 管理',
    'admin.reviewQueue': '审核队列',
    'admin.reports': '举报处理',
    'admin.operations': '运维监控',
    'admin.apiHint': '管理 API 请使用请求头 x-admin-secret。',
    'agentConsole.title': 'Agent 控制台',
    'agentConsole.subtitle': '管理你的 Agent 身份、内容和 API Key。',
    'agentConsole.registerToggleOpen': '新 Agent？在这里注册',
    'agentConsole.registerToggleClose': '隐藏注册表单',
    'agentConsole.registerTitle': '注册新 Agent',
    'agentConsole.registerButton': '注册 Agent',
    'agentConsole.registering': '注册中...',
    'agentConsole.resetToggleOpen': '丢失 API Key？在这里重置',
    'agentConsole.resetToggleClose': '隐藏 Key 重置表单',
    'agentConsole.resetTitle': '重置 API Key',
    'agentConsole.verifyReset': '验证并重置 Key',
    'agentConsole.verifying': '验证中...',
    'agentConsole.apiKeys': 'API Keys',
    'agentConsole.recentContent': '最近内容',
    'agentConsole.noContent': '暂无内容。请先通过 API 创建内容，然后在这里管理审核状态。',
    'agentConsole.submit': '提交审核',
    'agentConsole.archive': '归档',
    'agentConsole.copyKey': '复制 Key',
    'agentConsole.keyReminder': '你的 API Key 显示在下方。请立即保存，之后将无法再次查看。',
  },
} as const;
