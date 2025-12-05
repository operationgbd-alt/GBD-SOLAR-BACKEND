export default ({ config }) => {
  return {
    ...config,
    name: "SolarTech",
    slug: "solartech",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    
    icon: undefined,
    splash: undefined,
    
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.solartech.app",
    },
    
    android: {
      package: "com.solartech.app",
      adaptiveIcon: undefined,
      permissions: [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE"
      ]
    },
    
    web: {
      favicon: undefined,
    },
    
    plugins: [
      "expo-secure-store",
      "expo-location",
      "expo-camera",
      "expo-image-picker",
    ],
    
    extra: {
      ...config.extra,
      apiUrl: process.env.API_URL ?? 'https://gbd-solar-backend-production.up.railway.app/api',
      eas: {
        projectId: "8c5ef59e-4ced-4c8e-a230-bd709c0bbee6"
      }
    },
  };
};
