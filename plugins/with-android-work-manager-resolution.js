const { withProjectBuildGradle } = require('expo/config-plugins');

const resolutionBlock = `
allprojects {
  configurations.configureEach {
    resolutionStrategy {
      force 'androidx.work:work-runtime:2.8.1'
      force 'androidx.work:work-runtime-ktx:2.8.1'
    }
  }
}
`;

module.exports = function withAndroidWorkManagerResolution(config) {
  return withProjectBuildGradle(config, (projectConfig) => {
    if (projectConfig.modResults.language !== 'groovy') {
      throw new Error('Android WorkManager resolution requires a Groovy project build file.');
    }

    if (!projectConfig.modResults.contents.includes(resolutionBlock.trim())) {
      projectConfig.modResults.contents += resolutionBlock;
    }

    return projectConfig;
  });
};
