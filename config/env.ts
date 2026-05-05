import Constants from 'expo-constants';

const isDevelopment = !Constants.isDevice;

const getBaseUrl = (): string => {
  if (__DEV__) {
    const platform = Constants.platform;
    if (platform?.android) {
      return 'http://10.0.2.2:8000';
    } else {
      return 'http://localhost:8000';
    }
  }
  return 'https://api.cyber-diary.com';
};

export const env = {
  baseUrl: getBaseUrl(),
  timeout: 15000,
  isDevelopment,
};
