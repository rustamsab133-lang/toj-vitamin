import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tj.tojvitamin.rep',
  appName: 'Toj-Vitamin Представитель',
  webDir: 'public',
  server: {
    url: 'https://www.toj-vitamin.tj/rep',
    cleartext: false,
    allowNavigation: ['www.toj-vitamin.tj', 'toj-vitamin.tj']
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true
  }
};

export default config;
