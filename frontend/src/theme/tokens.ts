import type { ThemeConfig } from 'antd';

// Motion tokens
export const motion = {
  fast: '120ms',
  base: '180ms',
  slow: '240ms',
  xslow: '320ms',
  easeOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  easeInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
};

// Shared tokens
const sharedTokens = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  borderRadius: 12,
  borderRadiusLG: 16,
  borderRadiusSM: 8,
  borderRadiusXS: 4,
};

// Light theme
export const lightTheme: ThemeConfig = {
  token: {
    ...sharedTokens,
    colorPrimary: '#3b82f6',
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#06b6d4',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f8fafc',
    colorBgSpotlight: '#f1f5f9',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorTextTertiary: '#94a3b8',
    colorBorder: '#e2e8f0',
    colorBorderSecondary: '#f1f5f9',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    boxShadowSecondary: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  components: {
    Layout: {
      headerBg: '#ffffff',
      bodyBg: '#f8fafc',
      siderBg: '#ffffff',
    },
    Card: {
      colorBgContainer: '#ffffff',
    },
    Button: {
      primaryShadow: '0 2px 4px -1px rgba(59, 130, 246, 0.3)',
    },
  },
};

// Dark theme
export const darkTheme: ThemeConfig = {
  token: {
    ...sharedTokens,
    colorPrimary: '#60a5fa',
    colorSuccess: '#4ade80',
    colorWarning: '#fbbf24',
    colorError: '#f87171',
    colorInfo: '#22d3ee',
    colorBgContainer: '#1e293b',
    colorBgElevated: '#334155',
    colorBgLayout: '#0f172a',
    colorBgSpotlight: '#1e293b',
    colorText: '#f1f5f9',
    colorTextSecondary: '#94a3b8',
    colorTextTertiary: '#64748b',
    colorBorder: '#334155',
    colorBorderSecondary: '#1e293b',
    boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.3), 0 1px 2px -1px rgb(0 0 0 / 0.3)',
    boxShadowSecondary: '0 4px 6px -1px rgb(0 0 0 / 0.3), 0 2px 4px -2px rgb(0 0 0 / 0.3)',
  },
  components: {
    Layout: {
      headerBg: '#1e293b',
      bodyBg: '#0f172a',
      siderBg: '#1e293b',
    },
    Card: {
      colorBgContainer: '#1e293b',
    },
    Button: {
      primaryShadow: '0 2px 4px -1px rgba(96, 165, 250, 0.3)',
    },
  },
};
