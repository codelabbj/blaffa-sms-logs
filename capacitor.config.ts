import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'net.blaffa.sms',
  appName: 'Blaffa SMS',
  webDir: 'out',
  server: {
    url: 'https://sms.blaffa.net/',
    cleartext: true
  }
};

export default config;
