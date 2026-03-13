import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bizantinexpress.app',
  appName: 'BizantinExpress',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
