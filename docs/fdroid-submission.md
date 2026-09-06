# Submitting Kasette to F-Droid

F-Droid only distributes apps it builds itself from source, using metadata
submitted to their own [fdroiddata](https://gitlab.com/fdroid/fdroiddata)
repository, a GitLab merge request, and volunteer review. This repo cannot
trigger that on its own; the steps below are what to do when you're ready.

## Why Kasette qualifies

- Fully open source, BSD-3-Clause.
- No proprietary dependencies, trackers, ads, or analytics (Capacitor and
  AndroidX are both open source).
- No network access requested; 100% local storage and playback.
- The release build doesn't require our signing keystore to produce a valid
  APK: `android/app/build.gradle`'s `signingConfig` only applies if a
  keystore file exists at build time, so F-Droid's build server (which
  doesn't have our secrets) can run `./gradlew assembleRelease` and get an
  unsigned APK, then sign it with F-Droid's own key as usual.

## Steps

1. Fork <https://gitlab.com/fdroid/fdroiddata>.
2. Copy [`docs/fdroid-metadata.yml`](./fdroid-metadata.yml) into your fork as
   `metadata/com.kasette.app.yml`, updating `CurrentVersion` /
   `CurrentVersionCode` and the `commit` under `Builds` to match the tag you
   want F-Droid to build (e.g. `v1.2.0`).
3. Open a merge request against fdroiddata.
4. Wait for review. F-Droid's
   [contribution guide](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/)
   has the current process and expected turnaround; it's run by volunteers
   and can take weeks.
5. Once accepted, F-Droid rebuilds and republishes automatically on new
   tags, following `AutoUpdateMode: Version` / `UpdateCheckMode: Tags` in
   the metadata, as long as tag names keep matching the `versionName` in
   `android/app/build.gradle`.

## After acceptance

Add an F-Droid badge to the README, for example:

```markdown
[![F-Droid](https://img.shields.io/f-droid/v/com.kasette.app)](https://f-droid.org/packages/com.kasette.app/)
```
