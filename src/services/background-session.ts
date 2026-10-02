import { requireOptionalNativeModule } from "expo";
import { useEffect, useState } from "react";
import { AppRegistry, Platform } from "react-native";

// Keeps a breathing session running while the screen is off. Android only: the native side
// (modules/background-session) runs a foreground service with a partial wake lock, plus a
// headless JS task that keeps the React Native timers firing while the activity is paused.
// iOS and the web have no such module, and their sessions still pause in the background.

interface BackgroundSessionNativeModule {
  start(title: string, text: string): Promise<boolean>;
  stop(): Promise<void>;
  requestNotificationPermission(): Promise<unknown>;
}

const nativeModule =
  Platform.OS === "android"
    ? requireOptionalNativeModule<BackgroundSessionNativeModule>("BreathlyBackgroundSession")
    : null;

export const backgroundSessionSupported = nativeModule != null;

// Must match `KEEP_ALIVE_TASK_KEY` in BackgroundSessionModule.kt.
const keepAliveTaskKey = "BreathlySessionKeepAlive";

// The task does no work: it stays pending for as long as the session runs, because React
// Native fires JS timers in the background only while a headless task is active. The native
// module finishes it on stop too, so a task that never settles cannot leak.
let settleKeepAliveTasks: Array<() => void> = [];
if (nativeModule) {
  AppRegistry.registerHeadlessTask(
    keepAliveTaskKey,
    () => () =>
      new Promise<void>((resolve) => {
        settleKeepAliveTasks.push(resolve);
      }),
  );
}

const settlePendingKeepAliveTasks = () => {
  const settle = settleKeepAliveTasks;
  settleKeepAliveTasks = [];
  settle.forEach((resolve) => resolve());
};

const notificationTitle = "Breathly";

// Holds the session open in the background while `active` is true. Returns whether the
// session keeps running off screen; it turns false only when Android refused the service, and
// the caller then pauses in the background as it does on the other platforms.
export const useBackgroundSession = (active: boolean, description: string) => {
  const [startFailed, setStartFailed] = useState(false);

  useEffect(() => {
    if (!active || !nativeModule) return;
    let cancelled = false;

    const start = async () => {
      // Android 13 and later hide the session notification until the user allows it. The
      // session works without it, so the answer does not matter here.
      try {
        await nativeModule.requestNotificationPermission();
      } catch {
        // Nothing to do: the notification is a convenience.
      }
      if (cancelled) return;
      let started = false;
      try {
        started = await nativeModule.start(notificationTitle, description);
      } catch {
        started = false;
      }
      if (!cancelled) setStartFailed(!started);
    };
    void start();

    return () => {
      cancelled = true;
      settlePendingKeepAliveTasks();
      void nativeModule.stop().catch(() => undefined);
    };
  }, [active, description]);

  return backgroundSessionSupported && !startFailed;
};
