
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ispyai.app',
  appName: 'Ich sehe was AI',
  webDir: 'www',
  plugins: {
    Camera: {
      permissions: ['camera', 'photos']
    }
    // Speech recognition will use Web Speech API
  }
};

export default config;
