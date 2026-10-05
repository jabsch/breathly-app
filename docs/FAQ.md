# FAQ

Answers about the changes in this fork of Breathly. The changes live in
[pull request #1](https://github.com/jabsch/breathly-app/pull/1) and the pull requests after it,
and test builds are on the
[releases page](https://github.com/jabsch/breathly-app/releases).

Questions are ordered by how often they've been asked, most asked first. The counts are in
[`faq-asks.json`](./faq-asks.json), and `bun run faq:sort` reorders this page from them.

- [Where do I get the APK, and how do I install it?](#where-do-i-get-the-apk-and-how-do-i-install-it)
- [Does the app use dark mode?](#does-the-app-use-dark-mode)
- [How was it tested?](#how-was-it-tested)
- [Does the session keep going when the screen is off?](#does-the-session-keep-going-when-the-screen-is-off)
- [What is the default session?](#what-is-the-default-session)
- [How does the sauna timer work?](#how-does-the-sauna-timer-work)
- [Can I pause the two timers separately?](#can-i-pause-the-two-timers-separately)
- [What is the best way to share it with other people?](#what-is-the-best-way-to-share-it-with-other-people)
- [Should it be renamed?](#should-it-be-renamed)
- [Why does the app ask to send notifications?](#why-does-the-app-ask-to-send-notifications)
- [Does this work on iPhone?](#does-this-work-on-iphone)
- [What does the license allow?](#what-does-the-license-allow)
- [How do I create or edit an experience?](#how-do-i-create-or-edit-an-experience)
- [Can I leave a session running and go back to the home page?](#can-i-leave-a-session-running-and-go-back-to-the-home-page)
- [What do the countdown numbers, spoken numbers and soft beeps do?](#what-do-the-countdown-numbers-spoken-numbers-and-soft-beeps-do)
- [How do I change the volume of the voice and beeps, or keep my music playing?](#how-do-i-change-the-volume-of-the-voice-and-beeps-or-keep-my-music-playing)
- [How do I keep it updated with ObtainX?](#how-do-i-keep-it-updated-with-obtainx)

## Where do I get the APK, and how do I install it?

The easiest way is [ObtainX](https://github.com/bikram-agarwal/ObtainX), which also keeps it
updated (see [How do I keep it updated with ObtainX?](#how-do-i-keep-it-updated-with-obtainx)).
Or download the newest `.apk` from the [releases page](https://github.com/jabsch/breathly-app/releases).
Every change merged to `master` builds, tests and publishes a new release, named after its version
(for example `v2.3.12`). Builds of work in progress are marked as prereleases.

1. If Breathly from the Play Store or F-Droid is installed, uninstall it first. These builds are
   test-signed with the same app ID, so Android won't install them over the store version.
2. Open the downloaded file and allow your browser or file manager to install unknown apps when
   asked.
3. Allow notifications when the app asks.

## Does the app use dark mode?

Yes, the app now opens in dark mode. You can switch to light, or to "Use system theme", in
Settings, from the menu (swipe right on the home page, or tap ☰ in the top left).

## How was it tested?

The [Android APK workflow](../.github/workflows/android-apk.yml) builds the release APK and runs
[`scripts/android-smoke-test.sh`](../scripts/android-smoke-test.sh) on an Android 11 (API 30)
emulator before publishing. The smoke test:

- launches the app and checks the two starting cards: 5 minutes of 4-7-8 and the 15 minute sauna
  timer,
- starts both,
- turns the screen off for 40 seconds and checks that the background service is running,
- wakes the screen and checks that the breathing timer kept counting,
- pauses and resumes each timer on its own,
- swipes to the home page and back to the running session, then on to the menu,
- sends the app to the background and back,
- and checks the log for crashes.

The [Maestro flows](../.maestro/smoke) it runs are in the repository. Type checks, lint and unit
tests run separately in the [validate workflow](../.github/workflows/validate.yml).

## Does the session keep going when the screen is off?

Yes, on Android. While a breathing session or any timer runs, the app keeps a small
notification in the status bar. Behind it, a foreground service and a wake lock keep the timers,
voice prompts, counted numbers, beeps, bells and vibrations going with the screen off. The service stops as soon as nothing
is running, or when you swipe the app away.

Steps are driven by the clock, not by animations. If the phone stalls for a moment, the session
catches up to where it should be instead of drifting.

Source: [`modules/background-session`](../modules/background-session),
[`src/services/background-session.ts`](../src/services/background-session.ts) and
[`step-loop.ts`](../src/screens/exercise-screen/step-loop.ts).

## What is the default session?

Five minutes of 4-7-8 breathing ("4-7-8 Deep Calm"), the first card on the home page. If you used
the original app's defaults (Square, 2 minutes), they move to the new defaults on first launch.
Settings you changed yourself are kept: the session you had set up becomes that first card, and
your sauna time becomes the "Sauna timer" card.

Source: [`src/stores/settings-state.ts`](../src/stores/settings-state.ts).

## How does the sauna timer work?

The sauna timer is a saved timer card on the home page. It defaults to 15 minutes, and the − and +
buttons change it one minute at a time. Tap the pencil to rename it or change its length.

You can add as many timers as you like: tap **Create Experience**, open **Pattern**, pick **No
Pattern: Custom Timer** and give it a name. Timers run at the same time as each other and next to
a breathing session, and the running ones also show on the session screen.

When one ends, the phone vibrates and plays the bell, even if the screen is off and even if step
vibrations are turned off.

Source: [`src/screens/timers`](../src/screens/timers) and
[`src/stores/timers.ts`](../src/stores/timers.ts).

## Can I pause the two timers separately?

Yes. The breathing session has its own pause button next to the close button, and on its card,
and each timer has its own pause, resume and stop buttons. Pausing, resuming or stopping one never
touches the others. Only one breathing session runs at a time: starting another one ends the one
that is running.

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

## Why does the app ask to send notifications?

Android needs a visible notification to keep a foreground service running, and the service is
what keeps the timers going with the screen off. The notification is silent and goes away when
no timer is running.

## Does this work on iPhone?

The saved experiences, timers and dark mode work on iPhone, but the screen-off behavior is Android
only. iOS pauses the session when the app goes to the background, as before.

## What does the license allow?

Breathly uses the [Mozilla Public License 2.0](../LICENSE). You can modify and redistribute it,
including in app stores, as long as the modified source files stay under the MPL, the source is
available (this public repository covers that), and the license and copyright notices are kept.

## How do I create or edit an experience?

Tap **Create Experience** at the bottom of the home page. Pick a breathing pattern (or **No
Pattern: Custom Timer** for a plain timer), a voice, the counting options and a length, then tap
**Save Experience**. It shows up as a card on the home page, and the button stays at the bottom
however many cards there are.

Each card shows its pattern, voice and time, with − and + for the time, Start, and a pencil to
edit it. Delete an experience from the bottom of its edit page.

## Can I leave a session running and go back to the home page?

Yes. Swipe right on a running session, or tap the cards button between pause and close, and the
home page comes back while the session keeps going. Swipe left, or tap the session's card, to
return to it. Swiping right on the home page opens the menu from the left, with Settings, FAQ and
About. The ☰ button in the top left opens it too.

## What do the countdown numbers, spoken numbers and soft beeps do?

They are three switches on the Create Experience page, under Counting:

- **Countdown numbers** shows the seconds left in each step: Inhale 4, 3, 2, 1, Hold 7, 6, 5…
- **Say the numbers** has a voice count along. The chosen voice says the step's name at its start
  and the count follows on each second after it. The numbers come from the phone's text-to-speech
  voice, because the recorded voices only say the step names.
- **Soft beeps** plays a quiet beep every second.

## How do I change the volume of the voice and beeps, or keep my music playing?

Open Settings from the menu. The voice (with the counted numbers and bells) and the soft beeps
each have a volume, and each has an **Other audio** choice for what music from other apps does
while they play: keep playing, lower, or pause. Android decides how far "lower" goes; apps can't
set it. By default the voice lowers music and the beeps leave it alone. The spoken numbers come
from text-to-speech and don't change other audio.

## How do I keep it updated with ObtainX?

[ObtainX](https://github.com/bikram-agarwal/ObtainX) installs apps from their GitHub releases and
keeps them updated. It is a fork of [Obtainium](https://github.com/ImranR98/Obtainium), so the same
steps work in either.

1. Install ObtainX on the phone, from [F-Droid](https://f-droid.org/en/packages/dev.bikram.obtainx/)
   or its [releases page](https://github.com/bikram-agarwal/ObtainX/releases).
2. Add an app with `https://github.com/jabsch/breathly-app` as the source URL. Leave the other
   options as they are.
3. Install it. If an older Breathly from these releases is already installed, it updates in place
   and keeps your saved experiences.

It then checks for new releases and offers each one as an update. It follows the full releases
built from `master` and skips the prereleases unless you turn on prereleases for the app. Every
build is signed with the same test key and has a higher version than the last, so each one
installs over the one before.
