package expo.modules.breathly.backgroundsession

import android.Manifest
import android.content.Intent
import android.os.Build
import android.util.Log
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactContext
import com.facebook.react.jstasks.HeadlessJsTaskConfig
import com.facebook.react.jstasks.HeadlessJsTaskContext
import expo.modules.interfaces.permissions.Permissions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.lang.ref.WeakReference

class BackgroundSessionModule : Module() {
  private var keepAliveTaskId: Int? = null
  private var keepAliveTaskContext: WeakReference<ReactContext>? = null

  override fun definition() = ModuleDefinition {
    Name("BreathlyBackgroundSession")

    // Resolves to false when Android refuses the service, so the caller can fall back to
    // pausing the session in the background.
    AsyncFunction("start") { title: String, text: String ->
      startSession(title, text)
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("stop") {
      stopSession()
    }.runOnQueue(Queues.MAIN)

    AsyncFunction("requestNotificationPermission") { promise: Promise ->
      // Before Android 13 notifications need no runtime permission.
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
        promise.resolve(null)
        return@AsyncFunction
      }
      Permissions.askForPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        Manifest.permission.POST_NOTIFICATIONS
      )
    }

    OnDestroy {
      stopSession()
    }
  }

  private fun startSession(title: String, text: String): Boolean {
    val context = appContext.reactContext ?: return false
    val intent = Intent(context, BackgroundSessionService::class.java)
      .putExtra(BackgroundSessionService.EXTRA_TITLE, title)
      .putExtra(BackgroundSessionService.EXTRA_TEXT, text)

    // The session starts on screen, so a plain start is allowed, and the service moves itself
    // to the foreground right away. `startForegroundService` would instead crash the app if the
    // service then failed to reach the foreground.
    try {
      context.startService(intent)
    } catch (error: Exception) {
      Log.w(TAG, "Could not start the breathing session service", error)
      return false
    }

    startKeepAliveTask()
    return true
  }

  private fun stopSession() {
    finishKeepAliveTask()
    val context = appContext.reactContext ?: return
    context.stopService(Intent(context, BackgroundSessionService::class.java))
  }

  // React Native fires JS timers only while the activity is resumed or a headless JS task is
  // running. This task does no work of its own: it only holds the timers open.
  private fun startKeepAliveTask() {
    if (keepAliveTaskId != null) return
    val reactContext = currentReactContext() ?: return
    try {
      keepAliveTaskId = HeadlessJsTaskContext.getInstance(reactContext).startTask(
        HeadlessJsTaskConfig(
          KEEP_ALIVE_TASK_KEY,
          Arguments.createMap(),
          0,
          true
        )
      )
      keepAliveTaskContext = WeakReference(reactContext)
    } catch (error: Exception) {
      Log.w(TAG, "Could not start the keep-alive task", error)
    }
  }

  private fun finishKeepAliveTask() {
    val taskId = keepAliveTaskId ?: return
    keepAliveTaskId = null
    val reactContext = keepAliveTaskContext?.get()
    keepAliveTaskContext = null
    if (reactContext == null) return
    val taskContext = HeadlessJsTaskContext.getInstance(reactContext)
    if (taskContext.isTaskRunning(taskId)) taskContext.finishTask(taskId)
  }

  // The timers listen to the task context of the running React instance, so the task must be
  // started on that same context: the one `HeadlessJsTaskService` uses too.
  private fun currentReactContext(): ReactContext? {
    val application = appContext.reactContext?.applicationContext as? ReactApplication
    return application?.reactHost?.currentReactContext
      ?: appContext.reactContext as? ReactContext
  }

  companion object {
    private const val TAG = "BreathlySession"

    // Must match the key that the JS side registers with `AppRegistry.registerHeadlessTask`.
    private const val KEEP_ALIVE_TASK_KEY = "BreathlySessionKeepAlive"
  }
}
