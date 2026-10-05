#!/usr/bin/env bash
# Smoke test of the release APK on a running emulator: launch, a session that survives the
# screen turning off, the sauna timer next to it, and no crash along the way.
set -euo pipefail

apk="$1"
package="com.mmazzarolo.breathly"

# On a failure, print what was on screen: the debug files Maestro keeps are not always easy to
# reach, and the run log always is.
print_screen() {
  echo "::group::Screen at the failure"
  adb shell wm size || true
  adb shell wm density || true
  maestro hierarchy 2>/dev/null | python3 -c '
import json, sys
def walk(node, depth=0):
    attrs = node.get("attributes", {})
    label = attrs.get("resource-id") or attrs.get("text") or attrs.get("accessibilityText")
    if label:
        print("  " * min(depth, 20) + label + " " + attrs.get("bounds", "") +
              (" enabled" if attrs.get("enabled") == "true" else ""))
    for child in node.get("children", []):
        walk(child, depth + 1)
walk(json.load(sys.stdin))
' || true
  echo "::endgroup::"
}
trap print_screen ERR

adb install -r "$apk"
adb logcat -c

maestro test .maestro/flows/launch-and-exercise.yaml
maestro test .maestro/smoke/start-breathing-and-sauna.yaml

# The session counts down from five minutes. With the screen off for 40 seconds a timer that
# kept running reads 04:20 or less; one that stopped would still read 04:30 or more.
# (uiautomator cannot read the text itself: the breathing animation never lets it go idle.)
adb shell input keyevent KEYCODE_SLEEP
sleep 40

if ! adb shell dumpsys activity services "$package" | grep -q BackgroundSessionService; then
  echo "The background session service is not running with the screen off." >&2
  exit 1
fi

adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
sleep 2

maestro test .maestro/smoke/still-running.yaml
maestro test .maestro/flows/background-resume.yaml

if adb logcat -d -b crash | grep -q "$package"; then
  adb logcat -d -b crash >&2
  echo "The app crashed during the smoke test." >&2
  exit 1
fi

echo "Smoke test passed."
