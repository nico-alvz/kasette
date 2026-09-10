# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.3.2] - 2026-09-10

### Removed

- The `android.permission.INTERNET` permission. Kasette makes no network
  requests; the line was only present because Capacitor's Android scaffold
  adds it by default.

## [1.3.1] - 2026-09-08

### Fixed

- Disabled Android Gradle Plugin's "dependency metadata" signing block
  (`dependenciesInfo`), a Google Play-specific feature that F-Droid's build
  verifier flags as an unexpected extra signing block.

## [1.3.0] - 2026-09-07

### Added

- Language chips in Settings (English / Español), overriding the
  device-language auto-detection from any screen without needing to change
  the phone's system language.
- On Android, exporting a library backup now opens the system "Save As"
  picker, so the destination can be any folder on the phone, an SD card, or
  a USB drive, matching what was already possible on desktop browsers via
  the File System Access API.

## [1.2.2] - 2026-09-06

### Fixed

- The Android hardware/gesture back button closed the whole app instead of
  navigating within it (closing the player, a modal, or going back a screen).
  Capacitor's native back-button handling needs the `@capacitor/app` plugin
  registered to route the press into the web app at all; without it, Back
  exited immediately.

## [1.2.1] - 2026-09-06

### Fixed

- The restore-file picker still filtered for the old `.snora` extension after
  the backup format was renamed to `.kasette`, hiding valid backup files from
  the dialog on browsers without the File System Access API.
- `<html lang>` was hardcoded to `en` and never synced to the detected locale,
  so Spanish content could render under `lang="en"`.

## [1.2.0] - 2026-09-06

### Changed

- Renamed the project from Sonora to Kasette: GitHub repo, Android
  application ID (`com.sonora.app` → `com.kasette.app`), PWA name/manifest,
  IndexedDB database name, localStorage keys, and the library backup file
  format/extension (`.snora` → `.kasette`). Existing local data or backup
  files from the Sonora name won't carry over.
- Submitted Kasette to F-Droid.

### Added

- English and Latin American Spanish, chosen automatically from the device's
  language. No in-app language switcher yet.

## [1.1.4] - 2026-09-06

### Added

- Optional Cloudflare Pages deployment via Wrangler (`wrangler.jsonc`,
  `npm run deploy:cloudflare`), documented in
  [docs/cloudflare-pages.md](./docs/cloudflare-pages.md). GitHub Pages remains
  the project's actual deployment; this is an alternative reference setup.
- 📼 next to the project name in the README.

## [1.1.3] - 2026-09-05

### Changed

- Removed the accent-tinted gradient at the top of the playlist/album detail view.
- Playlist and "Imported songs" icon tiles no longer fade to a heavy black; the
  gradient stays closer to the accent color, and their shadow is lighter.

## [1.1.2] - 2026-09-05

### Fixed

- The Android status bar had its icon color backwards: light-mode icons were
  invisible on the white background.
- The bottom navigation bar (3-button/gesture) now also follows the in-app
  theme; it was always white with unreadable icons before.
- Aligned the search helper text with the search input's own text inset.

## [1.1.1] - 2026-09-05

### Changed

- Cassette icon now matches the classic compact-cassette look: cream label,
  color stripe band, spoked reels, and bottom mechanism cutouts.
- Tightened the spacing between the search bar and its helper text.
- Plainer README copy.

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
