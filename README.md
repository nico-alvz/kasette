# Sonora

A 100% offline, client-side music player PWA.

[![CI](https://github.com/nico-alvz/sonora/actions/workflows/ci.yml/badge.svg)](https://github.com/nico-alvz/sonora/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/nico-alvz/sonora/actions/workflows/pages.yml/badge.svg)](https://github.com/nico-alvz/sonora/actions/workflows/pages.yml)
[![Latest release](https://img.shields.io/github/v/release/nico-alvz/sonora)](https://github.com/nico-alvz/sonora/releases)
[![License: BSD-3-Clause](https://img.shields.io/badge/License-BSD--3--Clause-blue.svg)](./LICENSE)

Sonora plays the music files already on your device. Import them once, and
everything else — tags, cover art, playlists, playback — happens locally, no
backend involved.

## Privacy

Sonora is 100% local — no accounts, no servers, no analytics, no network
requests; your music never leaves your device. It only plays audio files you
already own, imported from your device.

## Features

- Import local audio files (mp3, flac, m4a, ogg, opus, wav, aac)
- Client-side ID3/FLAC tag and embedded cover art parsing (no dependencies)
- Playlists
- Light theme by default, with a dark mode and multiple accent colors
- Background playback via the Media Session API (lock screen / notification controls)
- Offline-first PWA
- Installable on desktop and mobile
- Android app via Capacitor

## Use it now

Open **[nico-alvz.github.io/sonora](https://nico-alvz.github.io/sonora/)** in your
browser. To install it as an app, use your browser's install prompt (usually
in the address bar or the browser menu).

## Download the Android app

Prebuilt APKs are published on the [Releases](https://github.com/nico-alvz/sonora/releases)
page. Since Sonora isn't distributed through the Play Store, you'll need to
enable "install from unknown sources" for your browser or file manager to
install the APK.

## Build from source

```bash
git clone https://github.com/nico-alvz/sonora.git
cd sonora
npm install

# Web
npm run dev

# Android
npx cap add android
npm run cap:sync
npm run cap:android   # opens the project in Android Studio
```

## Tech stack

- Vanilla JavaScript, ES modules — no framework, no build step
- IndexedDB for audio/art storage
- Web Audio / Media Session API for playback and background controls
- [Capacitor](https://capacitorjs.com/) for the Android wrapper

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

BSD-3-Clause. See [LICENSE](./LICENSE).
