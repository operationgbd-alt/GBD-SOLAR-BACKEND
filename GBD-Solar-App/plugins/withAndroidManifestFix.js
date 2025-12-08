const { withAndroidManifest } = require('@expo/config-plugins');

function withAndroidManifestFix(config) {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;
    
    // Add tools namespace for conflict resolution
    if (!manifest.$['xmlns:tools']) {
      manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    const application = manifest.application[0];
    
    // Add tools:replace to resolve manifest merger conflicts
    if (!application.$['tools:replace']) {
      application.$['tools:replace'] = 'android:allowBackup';
    }
    
    // Ensure allowBackup is set
    application.$['android:allowBackup'] = 'false';

    return config;
  });
}

module.exports = withAndroidManifestFix;
