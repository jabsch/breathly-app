import { FC, useEffect, useState } from "react";
import { Platform, Vibration } from "react-native";
import { playSaunaAlarmSound } from "@breathly/services/audio";
import { useBackgroundSession } from "@breathly/services/background-session";
import { useSaunaStore } from "@breathly/stores/sauna";

// Long enough for the bell (about six seconds) to ring out before the wake lock goes.
const alarmHoldMs = 8000;
const alarmVibrationPattern =
  Platform.OS === "android" ? [0, 600, 300, 600, 300, 600] : [0, 300, 300];

// Mounted once for the whole app, so the sauna timer keeps running on every screen and next
// to a breathing session. It rings when the time is up and holds the screen-off service on
// Android while the timer runs.
export const SaunaTimerController: FC = () => {
  const timer = useSaunaStore((state) => state.timer);
  const finish = useSaunaStore((state) => state.finish);
  const [alarmRinging, setAlarmRinging] = useState(false);

  useBackgroundSession(timer.status === "running" || alarmRinging, "Sauna timer running");

  const endsAtMs = timer.status === "running" ? timer.endsAtMs : undefined;
  useEffect(() => {
    if (endsAtMs === undefined) return;
    const timeout = setTimeout(
      () => {
        finish();
        setAlarmRinging(true);
        // An alarm, so it vibrates even when the breathing cues are set not to.
        Vibration.vibrate(alarmVibrationPattern);
        void playSaunaAlarmSound();
      },
      Math.max(0, endsAtMs - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [endsAtMs, finish]);

  useEffect(() => {
    if (!alarmRinging) return;
    const timeout = setTimeout(() => setAlarmRinging(false), alarmHoldMs);
    return () => clearTimeout(timeout);
  }, [alarmRinging]);

  return null;
};
