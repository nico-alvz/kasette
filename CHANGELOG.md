# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-09-05

### Added

- Export/restore the whole library (songs, art, playlists) as a single backup
  file. You can pick a USB-C drive as the destination if your browser offers it.
- Orange is now the default accent color.
- The Android status bar's icon color now follows the in-app light/dark theme.

### Changed

- Redesigned the app icon as a retro cassette tape.
- Softened the dark theme's background and shadows (previously too heavy).

## [1.0.0] - 2026-09-05

### Added

- Initial public release.
- Import local audio files (mp3, flac, m4a, ogg, opus, wav, aac).
- Client-side ID3/FLAC tag and embedded cover art parsing, no dependencies.
- Playlists, including an automatic "Imported songs" playlist.
- Background playback via the Media Session API (lock screen / notification controls).
- Offline-first PWA, installable on desktop and mobile.
- Light theme by default, with a dark mode, accent colors, and background options.
- Search across title, artist, and album.
- Android app via Capacitor.
