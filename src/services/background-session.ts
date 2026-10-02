import { requireOptionalNativeModule } from "expo";
import { useEffect, useState } from "react";
import { AppRegistry, Platform } from "react-native";

// Keeps the breathing session and the sauna timer running while the screen is off. Android
// only: the native side (modules/background-session) runs a foreground service with a partial
// wake lock, plus a headless JS task that keeps the React Native timers firing while the
// activity is paused. iOS and the web have no such module, and their sessions still pause in
// the background.
//
// The two timers run independently, so each one holds the service on its own; the service
// runs while at least one of them holds it, and its notification names what is running.

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

// The task does no work: it stays pending for as long as the service runs, because React
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

const holders = new Map<symbol, string>();
let shownText: string | undefined;
let notificationPermissionRequested = false;
let startFailed = false;
const startFailedListeners = new Set<(failed: boolean) => void>();
let pendingSync: Promise<void> = Promise.resolve();

const setStartFailed = (failed: boolean) => {
  if (startFailed === failed) return;
  startFailed = failed;
  startFailedListeners.forEach((listener) => listener(failed));
};

// Brings the service in line with the current holders. The calls are chained, so the native
// side always sees them in the order the holders changed.
const syncNativeSession = async (module: BackgroundSessionNativeModule) => {
  if (holders.size === 0) {
    if (shownText === undefined) return;
    shownText = undefined;
    settlePendingKeepAliveTasks();
    await module.stop().catch(() => undefined);
    return;
  }

  if (!notificationPermissionRequested) {
    notificationPermissionRequested = true;
    // Android 13 and later hide the notification until the user allows it. The service runs
    // either way, so the answer does not matter here.
    await module.requestNotificationPermission().catch(() => undefined);
    // The holders may have changed while the dialog was up.
    return syncNativeSession(module);
  }

  const text = [...new Set(holders.values())].join(" · ");
  if (text === shownText) return;
  const wasRunning = shownText !== undefined;
  let started = false;
  try {
    // A second start while the service runs only updates its notification.
    started = await module.start(notificationTitle, text);
  } catch {
    started = false;
  }
  if (started || !wasRunning) shownText = started ? text : undefined;
  // A failed update of the notification leaves the running service as it was.
  if (!wasRunning) setStartFailed(!started);
};

const requestSync = () => {
  const module = nativeModule;
  if (!module) return;
  pendingSync = pendingSync.then(() => syncNativeSession(module)).catch(() => undefined);
};

// Holds the service while `active` is true, with `description` in its notification. Returns
// whether timers keep running off screen; it is false where there is no service, and when
// Android refused to start it — the caller then pauses in the background instead.
export const useBackgroundSession = (active: boolean, description: string) => {
  const [failed, setFailed] = useState(startFailed);

  useEffect(() => {
    startFailedListeners.add(setFailed);
    return () => {
      startFailedListeners.delete(setFailed);
    };
  }, []);

  useEffect(() => {
    if (!active || !nativeModule) return;
    const holder = Symbol(description);
    holders.set(holder, description);
    requestSync();
    return () => {
      holders.delete(holder);
      requestSync();
    };
  }, [active, description]);

  return backgroundSessionSupported && !failed;
};
