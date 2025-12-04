export default ({ config }) => {
  return {
    ...config,
    name: "SolarTech",
    slug: "solartech",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    
    // IMPORTANTE: Sovrascriviamo le icone per evitare errori di file mancanti
    icon: undefined,
    splash: undefined,
    
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.solartech.app",
    },
    
    android: {
      package: "com.solartech.app",
      // Rimuoviamo adaptiveIcon per evitare errori
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
      // Rimuoviamo favicon
      favicon: undefined,
    },
    
    plugins: [
      "expo-router",
      "expo-secure-store",
      "expo-location",
      "expo-camera",
      "expo-image-picker",
    ],
    
    extra: {
      ...config.extra,
      apiUrl: process.env.API_URL ?? 'https://solartech-backend-production.up.railway.app/api',
    },
  };
};