package com.sati.meditation.sessionaudio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;

/**
 * Rings one scheduled bell, fired by an AlarmManager exact wake-up alarm.
 *
 * Bells ride exact alarms in BOTH session modes (ambient and silent),
 * because Handler.postDelayed counts uptimeMillis, which pauses in deep
 * sleep — an alarm is the only Android primitive that wakes the CPU at a
 * wall-clock moment. Sati's exact-alarm permissions were declared in Part 7
 * under Play's timer-app policy.
 *
 * A short partial wakelock keeps the CPU up for the bell's duration
 * (longest bundled bell is ~16s); playback itself runs on our app process,
 * which the alarm has just temporarily allowlisted.
 */
public class BellAlarmReceiver extends BroadcastReceiver {

    private static final String TAG = "SatiBellAlarm";

    static final String ACTION_RING_BELL = "com.sati.meditation.RING_BELL";
    static final String EXTRA_SOUND_PATH = "soundPath";
    static final String EXTRA_VOLUME = "volume";
    static final String EXTRA_BELL_KEY = "bellKey";

    /** Package-internal broadcast the plugin listens to for bellFired events. */
    static final String ACTION_BELL_FIRED = "com.sati.meditation.BELL_FIRED";

    private static final long WAKELOCK_TIMEOUT_MS = 25_000;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!ACTION_RING_BELL.equals(intent.getAction())) return;

        String soundPath = intent.getStringExtra(EXTRA_SOUND_PATH);
        String bellKey = intent.getStringExtra(EXTRA_BELL_KEY);
        float volume = intent.getFloatExtra(EXTRA_VOLUME, 0.8f);
        if (soundPath == null || bellKey == null) return;

        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        final PowerManager.WakeLock wakeLock =
            powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "sati:bell");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire(WAKELOCK_TIMEOUT_MS);

        Log.d(TAG, "Ringing bell " + bellKey);
        final Context appContext = context.getApplicationContext();
        BellPlayer.play(appContext, soundPath, volume, () -> {
            if (wakeLock.isHeld()) wakeLock.release();
        });

        // Tell the plugin (if the WebView is alive to hear it) so JS can
        // update its bookkeeping and flash the ring. Best-effort by design.
        Intent fired = new Intent(ACTION_BELL_FIRED);
        fired.setPackage(appContext.getPackageName());
        fired.putExtra(EXTRA_BELL_KEY, bellKey);
        appContext.sendBroadcast(fired);
    }
}
