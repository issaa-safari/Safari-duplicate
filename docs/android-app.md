# Android app (PWA + APK/TWA)

The app ships as an installable **PWA**, and can also be wrapped as a signed
**APK** (a TWA — Trusted Web Activity) that you sideload without Google Play.

Both point at the **same** live site — there is no separate app codebase. Ship
changes the normal way (merge → deploy) and the installed app updates too.

## Option 1 — Install the PWA (no build, nothing to sign)

On the phone, open the **live HTTPS site** (`https://safariadventureriders.com`)
in **Chrome** → menu **⋮ → Install app** (or *Add to Home screen*). It installs
full-screen with the Safari Riders icon. This is enough for most cases.

> Chrome only offers *Install app* over HTTPS on the real domain, not always on
> a Vercel preview URL. Test on production.

## Option 2 — Build a signed APK (TWA) to sideload

This produces an `.apk` file you can send to a phone and install directly.

### Prerequisites (on your computer, not in this repo)
- **Node.js** 18+
- **JDK 17** (`java -version`)
- Android SDK — Bubblewrap can download it for you on first run.

### Steps

1. Install Bubblewrap:
   ```bash
   npm install -g @bubblewrap/cli
   ```

2. Initialise the Android project from the live web manifest:
   ```bash
   mkdir sar-android && cd sar-android
   bubblewrap init --manifest https://safariadventureriders.com/manifest.webmanifest
   ```
   When prompted, use the values in [`twa/twa-manifest.json`](../twa/twa-manifest.json):
   - Application ID / package: `com.safariadventureriders.app`
   - App name: `Safari Adventure Riders`, launcher: `Safari Riders`
   - Theme/nav color: `#7A9A4A`, background: `#ffffff`
   - Let it **generate a new signing key** (or point it at your own keystore).

   To reuse the exact config in this repo instead of answering prompts, copy
   `twa/twa-manifest.json` into `sar-android/` after init, then run
   `bubblewrap update`.

3. Build:
   ```bash
   bubblewrap build
   ```
   This outputs `app-release-signed.apk` (sideload) and `app-release-bundle.aab`.

4. Get the signing-key SHA-256 fingerprint:
   ```bash
   bubblewrap fingerprint list
   # or, from a keystore directly:
   keytool -list -v -keystore android.keystore -alias android | grep SHA256
   ```

5. Put that fingerprint into **`public/.well-known/assetlinks.json`** (replace
   `REPLACE_WITH_YOUR_SIGNING_KEY_SHA256_FINGERPRINT`), then commit + deploy so
   it is live at
   `https://safariadventureriders.com/.well-known/assetlinks.json`.
   This Digital Asset Link is what lets the app run **full-screen without a URL
   bar**. Skip it and the app still works, but shows a Chrome address bar.

6. Install on a phone:
   ```bash
   adb install app-release-signed.apk
   ```
   …or transfer the APK to the device and open it (enable *Install unknown apps*
   for your file manager/browser).

### Keeping it working
- **Keep the keystore safe.** You need the same key to ship updates. If you lose
  it, existing installs can't be upgraded in place.
- If you regenerate the key, update `assetlinks.json` with the new fingerprint.
- The app content updates automatically from the website; you only rebuild the
  APK to change the icon, name, package, or Android-level behaviour.

## Files in this repo
- `app/manifest.ts` — the web app manifest (served at `/manifest.webmanifest`).
- `public/sw.js` — service worker (installability + offline fallback).
- `public/icons/` — app icons (192/512, maskable, apple-touch).
- `twa/twa-manifest.json` — Bubblewrap config (reference values for the APK).
- `public/.well-known/assetlinks.json` — Digital Asset Links (add your fingerprint).
