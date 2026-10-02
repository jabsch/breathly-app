package expo.modules.breathly.backgroundsession

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log

// Keeps a breathing session alive while the screen is off or another app is in front.
//
// Android pauses the React Native timers when the activity pauses, and stops the CPU soon after
// the screen turns off. A foreground service keeps the process at foreground priority, so its
// vibrations and audio cues are allowed, and the partial wake lock keeps the CPU running. The
// module starts a headless JS task next to it, which is what keeps the JS timers firing.
class BackgroundSessionService : Service() {
  private var wakeLock: PowerManager.WakeLock? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val title = intent?.getStringExtra(EXTRA_TITLE) ?: DEFAULT_TITLE
    val text = intent?.getStringExtra(EXTRA_TEXT) ?: DEFAULT_TEXT
    val notification = buildNotification(title, text)

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(
          NOTIFICATION_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        )
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
    } catch (error: Exception) {
      // Android 12 and later refuse the foreground from the background. The session then
      // behaves as it did before this service existed: it pauses when the app leaves the screen.
      Log.w(TAG, "Could not move the breathing session to the foreground", error)
      stopSelf()
      return START_NOT_STICKY
    }

    acquireWakeLock()
    // A session the system killed is not worth restarting: the JS side that drives it is gone.
    return START_NOT_STICKY
  }

  // Swiping the app away from the recents screen ends the session.
  override fun onTaskRemoved(rootIntent: Intent?) {
    stopSelf()
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    releaseWakeLock()
    super.onDestroy()
  }

  private fun acquireWakeLock() {
    if (wakeLock?.isHeld == true) return
    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, WAKE_LOCK_TAG).apply {
      setReferenceCounted(false)
      // The longest session is an hour. The timeout only bounds the cost of a service that
      // somehow outlives its session.
      acquire(WAKE_LOCK_TIMEOUT_MS)
    }
  }

  private fun releaseWakeLock() {
    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null
  }

  private fun buildNotification(title: String, text: String): Notification {
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val notificationManager =
        getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
      val channel = NotificationChannel(
        CHANNEL_ID,
        CHANNEL_NAME,
        NotificationManager.IMPORTANCE_LOW
      ).apply {
        description = CHANNEL_DESCRIPTION
        setShowBadge(false)
        setSound(null, null)
        enableVibration(false)
      }
      notificationManager.createNotificationChannel(channel)
      Notification.Builder(this, CHANNEL_ID)
    } else {
      @Suppress("DEPRECATION")
      Notification.Builder(this).setPriority(Notification.PRIORITY_LOW)
    }

    builder
      .setSmallIcon(R.drawable.breathly_session_notification)
      .setContentTitle(title)
      .setContentText(text)
      .setOngoing(true)
      .setShowWhen(false)
      .setCategory(Notification.CATEGORY_SERVICE)
      .setVisibility(Notification.VISIBILITY_PUBLIC)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
    }

    // Tapping the notification brings the running session back on screen.
    packageManager.getLaunchIntentForPackage(packageName)?.let { launchIntent ->
      builder.setContentIntent(
        PendingIntent.getActivity(
          this,
          0,
          launchIntent,
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
      )
    }

    return builder.build()
  }

  companion object {
    const val EXTRA_TITLE = "title"
    const val EXTRA_TEXT = "text"

    private const val TAG = "BreathlySession"
    private const val NOTIFICATION_ID = 4780
    private const val CHANNEL_ID = "breathing-session"
    private const val CHANNEL_NAME = "Breathing session"
    private const val CHANNEL_DESCRIPTION =
      "Shown while a breathing session keeps running with the screen off."
    private const val DEFAULT_TITLE = "Breathly"
    private const val DEFAULT_TEXT = "Breathing session in progress"
    private const val WAKE_LOCK_TAG = "Breathly:BreathingSession"
    private const val WAKE_LOCK_TIMEOUT_MS = 2L * 60L * 60L * 1000L
  }
}
