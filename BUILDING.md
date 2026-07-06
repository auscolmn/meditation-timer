# Building & Releasing Sati

React 19 + TypeScript + Vite web app wrapped with Capacitor 8 for Android and iOS.
The Netlify deployment is **testing only** — the launch targets are the app stores.

## Requirements

- **Node 20+** and npm
- **JDK 21** — required since the Capacitor 8 plugin bump (`@capacitor/filesystem` 8.x
  and friends ship Java 21 bytecode). Android Studio's bundled JetBrains Runtime works:
  point `JAVA_HOME` at it, e.g.
  `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`
  (macOS) or set `org.gradle.java.home` in `android/gradle.properties`.
  The Java version is pinned in two places that must agree:
  `android/build.gradle` (a `subprojects` override forcing all plugin modules to 21)
  and `android/app/build.gradle` (`compileOptions`).
- **Android Studio** (Android) / **Xcode** (iOS)

## The one rule that has bitten us before

> **Every plugin install or update requires `npx cap sync`.**

`npm install @capacitor/<plugin>` only changes `node_modules`. Until you run
`npx cap sync`, the native project knows nothing about the plugin — and the failure
is *silent*: JS calls resolve against a stub and simply do nothing. The keep-awake and
local-notifications plugins added in Part 4 of the code review were broken this way for
two full parts before device testing caught it. When in doubt, sync.

## Everyday development

```bash
npm install          # once, or after dependency changes
npm run dev          # Vite dev server (web)
npm test             # vitest
npm run build        # type-check + production bundle into dist/

# Run on device/emulator:
npm run build && npx cap sync && npx cap open android   # or: ios
```

## Versioning

The app version lives in **three hand-maintained places** that must stay aligned:

| Where | Field | Current |
|---|---|---|
| `package.json` | `version` (drives the About card via `__APP_VERSION__`) | 1.0.0 |
| `android/app/build.gradle` | `versionName` | 1.0.0 |
| `ios/App/App.xcodeproj/project.pbxproj` | `MARKETING_VERSION` (×2 occurrences) | 1.0.0 |

Additionally, **every store upload must bump the build number** — Play rejects a reused
`versionCode` (`android/app/build.gradle`) and App Store Connect rejects a reused
`CURRENT_PROJECT_VERSION` (pbxproj). Bump these even for a re-upload of the same
marketing version.

## Android release build

### One-time signing setup

1. Generate an upload keystore (do this **outside** the repo, e.g. `~/keystores/`):

   ```bash
   keytool -genkey -v -keystore ~/keystores/sati-upload.jks \
     -keyalg RSA -keysize 2048 -validity 10000 -alias sati-upload
   ```

2. Create `android/key.properties` (git-ignored — never commit it):

   ```properties
   storeFile=/Users/<you>/keystores/sati-upload.jks
   storePassword=<store password>
   keyAlias=sati-upload
   keyPassword=<key password>
   ```

3. Wire it into `android/app/build.gradle` (above the `android {` block):

   ```groovy
   def keystoreProperties = new Properties()
   def keystorePropertiesFile = rootProject.file("key.properties")
   if (keystorePropertiesFile.exists()) {
       keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
   }
   ```

   and inside `android {`:

   ```groovy
   signingConfigs {
       release {
           if (keystorePropertiesFile.exists()) {
               storeFile file(keystoreProperties['storeFile'])
               storePassword keystoreProperties['storePassword']
               keyAlias keystoreProperties['keyAlias']
               keyPassword keystoreProperties['keyPassword']
           }
       }
   }
   ```

   then add `signingConfig signingConfigs.release` to `buildTypes.release`.

4. Enroll in **Play App Signing** when creating the Play listing. Google then holds
   the app signing key and your keystore is only the *upload* key — recoverable if lost.

Back up the keystore and passwords in a password manager regardless.

### Building the bundle

```bash
npm run build && npx cap sync android
cd android && ./gradlew bundleRelease
# output: android/app/build/outputs/bundle/release/app-release.aab
```

Upload the `.aab` to the Play Console (not an APK). `minifyEnabled` is deliberately
`false`: nearly all of Sati's code is web assets R8 never touches, and minification has
a history of breaking Capacitor plugin reflection for a negligible size win.

## iOS release build

In Xcode: select the App target → Signing & Capabilities → set your team; then
Product → Archive → Distribute. Version fields are under the General tab
(`MARKETING_VERSION` / `CURRENT_PROJECT_VERSION`).

## Permissions we declare (and why)

- `INTERNET` — WebView/dev-server plumbing; the app makes no network calls of its own.
- `USE_EXACT_ALARM` + `SCHEDULE_EXACT_ALARM` (maxSdk 32) — punctual end-of-session
  notifications. Sati is a timer app, which is the acceptable core use case in Play
  policy for exact alarms. When the Play Console asks for a declaration, the answer is:
  *core functionality is a meditation timer; the exact alarm delivers the
  end-of-session notification the user explicitly started.*
- `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` — merged in by
  `@capacitor/local-notifications` automatically.
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` — Part 9 background
  audio. The service runs ONLY for sessions with an ambient sound and only for the
  session's duration, genuinely playing audio the whole time — which is what makes
  the `mediaPlayback` type declaration honest. Play Console will ask for a video/
  justification for the FGS type: *the user starts a meditation session with
  looping ambient audio; the service keeps that audio playing while the screen is
  locked and stops when the session ends.*
- `WAKE_LOCK` — explicitly declared now (previously merged in by
  local-notifications): the bell alarm receiver holds a ~25s partial wakelock so a
  bell rung by an exact alarm can finish sounding before the CPU sleeps again.

## Background session audio (Part 9)

Bells and ambient audio now play natively so they work with the screen locked.
JS computes absolute wall-clock timestamps for every bell when the meditation
phase starts (and on every resume) and hands the plan to the in-tree
`SessionAudio` plugin; native rings them regardless of WebView state.

**Android** — bells ride `AlarmManager` exact wake-up alarms in every session
mode (Handler timers pause in deep sleep; alarms are the only primitive that
wakes the CPU at a wall-clock moment — the same reasoning as the Part 7
exact-alarm permissions). Ambient sound loops in a `mediaPlayback` foreground
service that exists only while a session with ambient audio is running.
Known edge, accepted: alarm PendingIntents survive process death, so swiping
the app away mid-silent-session can let that session's remaining bells still
ring; the plugin cancels the whole (bounded) alarm range on every app start,
so nothing outlives the next launch.

**iOS** — `UIBackgroundModes: audio` + an active `.playback` AVAudioSession
keep the app alive in the background, but *only while audio is genuinely
playing*. So the native pipeline runs only for sessions WITH ambient sound
(bells on wall-deadline timers). Silent sessions are suspended on lock no
matter what: there, the end-of-session notification carries the ending bell
as its notification sound (IMA4 `.caf` copies of the bundled bells ship in
`public/sounds/notif/` and are installed to `Library/Sounds` on first run).
Documented limitations, all settled product decisions:

- `.playback` ignores the silent switch (a deliberately started session must
  ring); the notification-sound fallback for silent sessions *respects* the
  switch — the asymmetry is unavoidable without a critical-alerts entitlement.
- Interval bells cannot ring on a locked iPhone during a *silent* session
  (each would need its own notification).
- Custom ending sounds have no CAF counterpart; silent-session notifications
  fall back to the classic bell.
- No lock-screen media controls, deliberately: a sit is not a media player.

App Review justification for the audio background mode: *the app plays
user-selected ambient sound for the duration of a meditation session the user
explicitly starts, including while the device is locked; the session's ending
bell plays through the same audio session.*

### iOS status: UNTESTED — no Mac available

The entire iOS side of Part 9 (`SessionAudioPlugin.swift`,
`MainViewController.swift`, the storyboard/pbxproj/Info.plist changes) was
written without access to a Mac. It has never been compiled, run, or
device-tested, and iOS cannot be built or submitted at all until Mac access
exists. Before any App Store work: build in Xcode, expect to fix compile
errors, and smoke-test locked-screen ambient + bells on a real device.
**Android is the launch platform; treat all iOS code as a head start, not a
finished feature.**

## Store submission checklist

- [ ] Privacy policy URL — required by Play even for apps that collect nothing.
      Sati's story is strong: all data stays on-device, no accounts, no analytics,
      no network calls. Say so plainly.
- [ ] Play **Data safety** form → "No data collected or shared."
- [ ] Apple **App Privacy** → "Data Not Collected."
- [ ] Exact alarm declaration in Play Console (see above).
- [ ] `versionCode` / `CURRENT_PROJECT_VERSION` bumped since last upload.
- [ ] Screenshots (portrait; the app is portrait-locked on phones).
- [ ] **The `appId` `com.sati.meditation` is permanent once published.** Last chance
      to change it is before the first Play upload.

## App icons & splash screens

Source masters live in `assets/` (1024×1024 brand files plus generated 2732×2732
splashes). Native outputs are checked in under `android/.../res/` and
`ios/App/App/Assets.xcassets/`. Colors: brand cream `#FCF8EF` (icon background),
app light `#F7F7F7` / dark `#1A1918` (splash backgrounds, matching the app's first
paint in each theme). The Android notification small icon is
`res/drawable-*/ic_stat_sati.png` (white-on-transparent, required by Android),
configured in `capacitor.config.json`.
