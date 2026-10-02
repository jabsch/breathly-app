#!/usr/bin/env bash
# Smoke test of the release APK on a running emulator: launch, a session that survives the
# screen turning off, the sauna timer next to it, and no crash along the way.
set -euo pipefail

apk="$1"
package="com.mmazzarolo.breathly"

# Reads the text of the view with the given test ID from the accessibility tree.
read_view_text() {
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null
  adb shell cat /sdcard/ui.xml | tr '>' '\n' | grep "resource-id=\"$1\"" | sed -E 's/.* text="([^"]*)".*/\1/' | head -1
}

to_seconds() {
  local minutes="${1%%:*}" seconds="${1##*:}"
  echo $((10#$minutes * 60 + 10#$seconds))
}

adb install -r "$apk"
adb logcat -c

maestro test .maestro/flows/launch-and-exercise.yaml
maestro test .maestro/smoke/start-breathing-and-sauna.yaml

before="$(read_view_text exercise.timer)"
echo "Breathing timer before the screen turned off: $before"

adb shell input keyevent KEYCODE_SLEEP
sleep 30

if ! adb shell dumpsys activity services "$package" | grep -q BackgroundSessionService; then
  echo "The background session service is not running with the screen off." >&2
  exit 1
fi

adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
sleep 2

after="$(read_view_text exercise.timer)"
echo "Breathing timer after 30 seconds with the screen off: $after"
elapsed=$(($(to_seconds "$before") - $(to_seconds "$after")))
if ((elapsed < 25)); then
  echo "The breathing timer advanced only ${elapsed}s while the screen was off." >&2
  exit 1
fi

maestro test .maestro/smoke/still-running.yaml
maestro test .maestro/flows/background-resume.yaml

if adb logcat -d -b crash | grep -q "$package"; then
  adb logcat -d -b crash >&2
  echo "The app crashed during the smoke test." >&2
  exit 1
fi

echo "Smoke test passed."
