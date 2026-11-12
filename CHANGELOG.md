# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [2.0.1] - 2026-11-11

### Changed

- Android: uses `com.moonetix:offerwall:2.0.1`. iOS: uses `MoonetixOfferwall` 2.0.1, bundled as `MoonetixOfferwall.xcframework`.
- Only pages on `wall.moonetix.com` stay inside the offerwall screen. Every other host opens outside the app.
- The top bar logo loads only from `moonetix.com` and `wall.moonetix.com`.

### Fixed

- The Expo config plugin warning now links to the Install section of the docs (`react-native-sdk#install`). The `#android` anchor it used does not exist.

## [2.0.0] - 2026-11-06

### Changed

- First release under the Moonetix name. The previous package stays published and keeps working.
- Package `@moonetix/react-native-offerwall`, class `Moonetix`, error class `MoonetixError`.
- Android: uses `com.moonetix:offerwall:2.0.0` from https://moonetix.com/maven, added to Gradle automatically.
- iOS: uses `MoonetixOfferwall` 2.0.0, bundled as `MoonetixOfferwall.xcframework`.
- The wall opens on `wall.moonetix.com`.
