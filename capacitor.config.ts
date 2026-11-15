import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.guevara.rotacioncircuitos',
  appName: 'Rotación de Circuitos',
  webDir: 'dist',
  backgroundColor: '#0a3b31',
  android: {
    adjustMarginsForEdgeToEdge: 'auto',
  },
};

export default config;
