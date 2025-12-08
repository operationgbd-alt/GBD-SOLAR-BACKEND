const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export default ({ config }) => {
  return {
    ...config,
    name: "SolarTech",
    slug: "solartech",
    version: "1.0.0",
    scheme: "solartech",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.operationgbd.solartech",
    },
    
    android: {
      package: "com.operationgbd.solartech",
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.INTERNET",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE"
      ],
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey
        }
      }
    },
    
    web: {
      bundler: "metro",
    },
    
    plugins: [
      [
        "expo-build-properties",
        {
          android: {
            minSdkVersion: 26,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
          },
        },
      ],
      "expo-secure-store",
      "expo-mail-composer",
      "expo-web-browser",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow SolarTech to access your location."
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow SolarTech to access your camera."
        }
      ],
      [
        "expo-image-picker",
        {
          photosPermission: "Allow SolarTech to access your photos."
        }
      ],
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
