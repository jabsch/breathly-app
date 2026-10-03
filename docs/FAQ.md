# FAQ

Answers about the changes in this fork of Breathly. The changes live in
[pull request #1](https://github.com/jabsch/breathly-app/pull/1), and test builds are on the
[releases page](https://github.com/jabsch/breathly-app/releases).

- [Does the session keep going when the screen is off?](#does-the-session-keep-going-when-the-screen-is-off)
- [What is the default session?](#what-is-the-default-session)
- [How does the sauna timer work?](#how-does-the-sauna-timer-work)
- [Can I pause the two timers separately?](#can-i-pause-the-two-timers-separately)
- [Does the app use dark mode?](#does-the-app-use-dark-mode)
- [Where do I get the APK, and how do I install it?](#where-do-i-get-the-apk-and-how-do-i-install-it)
- [Why does the app ask to send notifications?](#why-does-the-app-ask-to-send-notifications)
- [How was it tested?](#how-was-it-tested)
- [Does this work on iPhone?](#does-this-work-on-iphone)
- [What is the best way to share it with other people?](#what-is-the-best-way-to-share-it-with-other-people)
- [Should it be renamed?](#should-it-be-renamed)
- [What does the license allow?](#what-does-the-license-allow)

## Does the session keep going when the screen is off?

Yes, on Android. While a breathing session or the sauna timer runs, the app keeps a small
notification in the status bar. Behind it, a foreground service and a wake lock keep the timers,
voice prompts, bells and vibrations going with the screen off. The service stops as soon as nothing
is running, or when you swipe the app away.

Steps are driven by the clock, not by animations. If the phone stalls for a moment, the session
catches up to where it should be instead of drifting.

Source: [`modules/background-session`](../modules/background-session),
[`src/services/background-session.ts`](../src/services/background-session.ts) and
[`step-loop.ts`](../src/screens/exercise-screen/step-loop.ts).

## What is the default session?

Five minutes of 4-7-8 breathing ("4-7-8 Deep Calm"). If you used the original app's defaults
(Square, 2 minutes), they move to the new defaults on first launch. Settings you changed yourself
are kept.

Source: [`src/stores/settings-state.ts`](../src/stores/settings-state.ts).

## How does the sauna timer work?

The sauna timer card is on the home screen above the start button. It defaults to 15 minutes, and
the − and + buttons change it one minute at a time, from 1 to 60 minutes. It runs alongside a
breathing session, and it also shows on the exercise screen while it runs.

When it ends, the phone vibrates and plays the bell, even if the screen is off and even if step
vibrations are turned off.

Source: [`src/screens/sauna`](../src/screens/sauna) and [`src/stores/sauna.ts`](../src/stores/sauna.ts).

## Can I pause the two timers separately?

Yes. The breathing session has its own pause button next to the close button, and the sauna timer
has its own pause, resume and stop buttons. Pausing, resuming or stopping one never touches the
other.

## Does the app use dark mode?

Yes, the app now opens in dark mode. You can switch to light, or to "Use system theme", in
settings.

## Where do I get the APK, and how do I install it?

Download the newest `.apk` from the [releases page](https://github.com/jabsch/breathly-app/releases).
The first build is [Breathly test build b263c49](https://github.com/jabsch/breathly-app/releases/tag/apk-b263c49).
Each push to the development branch builds, tests and publishes a new one.

1. If Breathly from the Play Store or F-Droid is installed, uninstall it first. These builds are
   test-signed with the same app ID, so Android won't install them over the store version.
2. Open the downloaded file and allow your browser or file manager to install unknown apps when
   asked.
3. Allow notifications when the app asks.

## Why does the app ask to send notifications?

Android needs a visible notification to keep a foreground service running, and the service is
what keeps the timers going with the screen off. The notification is silent and goes away when
no timer is running.

## How was it tested?

The [Android APK workflow](../.github/workflows/android-apk.yml) builds the release APK and runs
[`scripts/android-smoke-test.sh`](../scripts/android-smoke-test.sh) on an Android 11 (API 30)
emulator before publishing. The smoke test:

- launches the app and checks the 4-7-8, 5 minute and 15 minute sauna defaults,
- starts both timers,
- turns the screen off for 40 seconds and checks that the background service is running,
- wakes the screen and checks that the breathing timer kept counting,
- pauses and resumes each timer on its own,
- sends the app to the background and back,
- and checks the log for crashes.

The [Maestro flows](../.maestro/smoke) it runs are in the repository. Type checks, lint and unit
tests run separately in the [validate workflow](../.github/workflows/validate.yml).

## Does this work on iPhone?

The timer, sauna and dark mode changes work on iPhone, but the screen-off behavior is Android
only. iOS pauses the session when the app goes to the background, as before.

## What is the best way to share it with other people?

There are two routes, and they work together.

1. **Offer the changes to the original project.** If the original author accepts them, everyone
   using Breathly gets the update without switching apps. The original
   [README](https://github.com/mmazzarolo/breathly-app#contributing) welcomes pull requests, but
   notes that the F-Droid version isn't maintained by the author.
2. **Publish your own version.** In order of effort:
   - **GitHub Releases plus [Obtainium](https://github.com/ImranR98/Obtainium):** free and works
     today. Obtainium installs and updates apps straight from GitHub releases.
   - **[IzzyOnDroid](https://apt.izzysoft.de/fdroid/):** a free F-Droid-style repository that picks
     up GitHub releases.
   - **[F-Droid](https://f-droid.org/docs/Submitting_to_F-Droid_Quick_Start_Guide/):** free, but
     review takes weeks.
   - **[Google Play](https://support.google.com/googleplay/android-developer/answer/14151465):** a
     one-time $25 developer fee, and a new personal account must run a closed test with 12 testers
     for 14 days before publishing.

## Should it be renamed?

Yes, if you publish your own version. The builds still use the original app ID
(`com.mmazzarolo.breathly`), which means:

- they can't be installed next to the original app, and
- stores reject an app that reuses another developer's ID.

A new name, a new app ID (for example `com.jabsch.<name>`) and a permanent signing key fix both.
They also make it clear the build isn't the original author's release. Keep a credit to the
original author in the app and the README.

## What does the license allow?

Breathly uses the [Mozilla Public License 2.0](../LICENSE). You can modify and redistribute it,
including in app stores, as long as the modified source files stay under the MPL, the source is
available (this public repository covers that), and the license and copyright notices are kept.
