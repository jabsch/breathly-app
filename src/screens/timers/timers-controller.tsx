import { FC, useEffect, useState } from "react";
import { Platform, Vibration } from "react-native";
import { playTimerAlarmSound } from "@breathly/services/audio";
import { useBackgroundSession } from "@breathly/services/background-session";
import { useSettingsStore } from "@breathly/stores/settings";
import { useTimer, useTimersStore } from "@breathly/stores/timers";

// Long enough for the bell (about six seconds) to ring out before the wake lock goes.
const alarmHoldMs = 8000;
const alarmVibrationPattern =
  Platform.OS === "android" ? [0, 600, 300, 600, 300, 600] : [0, 300, 300];

// Mounted once for the whole app, so the timers keep running on every screen and next to a
// breathing session. Each started timer gets a runner of its own.
export const TimersController: FC = () => {
  const timerIds = useTimersStore((state) => Object.keys(state.timers).join("\n"));
  return (
    <>
      {timerIds
        .split("\n")
        .filter((id) => id !== "")
        .map((id) => (
          <TimerRunner key={id} id={id} />
        ))}
    </>
  );
};

// Rings when the time is up and holds the screen-off service on Android while the timer runs.
const TimerRunner: FC<{ id: string }> = ({ id }) => {
  const timer = useTimer(id);
  const finish = useTimersStore((state) => state.finish);
  const name = useSettingsStore(
    (state) => state.experiences.find((experience) => experience.id === id)?.name ?? "Timer",
  );
  const [alarmRinging, setAlarmRinging] = useState(false);

  useBackgroundSession(timer.status === "running" || alarmRinging, `${name} running`);

  const endsAtMs = timer.status === "running" ? timer.endsAtMs : undefined;
  useEffect(() => {
    if (endsAtMs === undefined) return;
    const timeout = setTimeout(
      () => {
        finish(id);
        setAlarmRinging(true);
        // An alarm, so it vibrates even when the breathing cues are set not to.
        Vibration.vibrate(alarmVibrationPattern);
        void playTimerAlarmSound();
      },
      Math.max(0, endsAtMs - Date.now()),
    );
    return () => clearTimeout(timeout);
  }, [endsAtMs, finish, id]);

  useEffect(() => {
    if (!alarmRinging) return;
    const timeout = setTimeout(() => setAlarmRinging(false), alarmHoldMs);
    return () => clearTimeout(timeout);
  }, [alarmRinging]);

  return null;
};
