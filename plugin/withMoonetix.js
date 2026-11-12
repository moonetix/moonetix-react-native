'use strict';

// Expo config plugin for @moonetix/react-native-offerwall. Adds the Moonetix Maven repository
// (https://moonetix.com/maven, com.moonetix group only) to the generated Android project, so
// `npx expo prebuild` and EAS Build resolve com.moonetix:offerwall. iOS needs no changes: the
// Moonetix iOS SDK ships inside the package and CocoaPods links it.

const {
  WarningAggregator,
  createRunOncePlugin,
  withProjectBuildGradle,
  withSettingsGradle,
} = require('expo/config-plugins');

const { addMavenRepoToBuildGradle, addMavenRepoToSettingsGradle } = require('./gradle');
const pkg = require('../package.json');

const DOCS = 'https://docs.moonetix.com/react-native-sdk#install';

function withMoonetixMaven(config) {
  config = withProjectBuildGradle(config, (mod) => {
    if (mod.modResults.language === 'groovy' || mod.modResults.language === 'kt') {
      mod.modResults.contents = addMavenRepoToBuildGradle(mod.modResults.contents);
    } else {
      WarningAggregator.addWarningAndroid(pkg.name, `Add the Moonetix Maven repository yourself: ${DOCS}`);
    }
    return mod;
  });
  config = withSettingsGradle(config, (mod) => {
    if (mod.modResults.language === 'groovy' || mod.modResults.language === 'kt') {
      mod.modResults.contents = addMavenRepoToSettingsGradle(mod.modResults.contents);
    }
    return mod;
  });
  return config;
}

module.exports = createRunOncePlugin(withMoonetixMaven, pkg.name, pkg.version);
