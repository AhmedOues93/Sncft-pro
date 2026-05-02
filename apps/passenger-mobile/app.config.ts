import type { ExpoConfig } from 'expo/config';

export default (): ExpoConfig => ({
  name: 'SNCFT Navigator',
  slug: 'sncft-passenger-mobile',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  assetBundlePatterns: ['**/*'],
  experiments: {
    typedRoutes: false,
  },
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000',
  },
  web: {
    bundler: 'metro',
    output: 'single',
  },
});
