# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-09-05

### Added

- Initial public release.
- Import local audio files (mp3, flac, m4a, ogg, opus, wav, aac).
- Client-side ID3/FLAC tag and embedded cover art parsing, no dependencies.
- Playlists, including an automatic "Imported songs" playlist.
- Background playback via the Media Session API (lock screen / notification controls).
- Offline-first PWA, installable on desktop and mobile.
- Light theme by default, with a dark mode, accent colors, and background options.
- Export/restore the whole library as a single backup file, for offline copies (e.g. a USB-C drive).
- Search across title, artist, and album.
- Android app via Capacitor.
