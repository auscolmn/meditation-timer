package com.sati.meditation.sessionaudio;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

/**
 * SessionAudio (Part 9): native ownership of the locked-screen session
 * schedule. JS hands over absolute wall-clock bell timestamps plus optional
 * ambient audio when the meditation phase starts; from then on this side
 * rings the bells whether or not the WebView is awake.
 *
 * Bells -> AlarmManager exact wake-up alarms -> BellAlarmReceiver.
 * Ambient -> SessionAudioService (mediaPlayback foreground service).
 *
 * Known edge (documented in BUILDING.md): PendingIntent alarms survive
 * process death, so if the user swipes the app away mid-silent-session, the
 * remaining bells for that session can still ring. Alarms use a fixed,
 * bounded request-code range, and load() cancels the whole range on every
 * app start, so stale bells never outlive the next launch.
 */
@CapacitorPlugin(name = "SessionAudio")
public class SessionAudioPlugin extends Plugin {

    private static final String TAG = "SatiSessionAudio";

    // Fixed request-code range for bell alarms; also the per-session cap.
    private static final int REQUEST_CODE_BASE = 42000;
    private static final int MAX_BELLS = 64;

    private BroadcastReceiver bellFiredReceiver;

    @Override
    public void load() {
        // Clear any alarms a killed session may have left behind.
        cancelAllBellAlarms();

        bellFiredReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String key = intent.getStringExtra(BellAlarmReceiver.EXTRA_BELL_KEY);
                if (key == null) return;
                JSObject event = new JSObject();
                event.put("key", key);
                notifyListeners("bellFired", event);
            }
        };
        IntentFilter filter = new IntentFilter(BellAlarmReceiver.ACTION_BELL_FIRED);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(bellFiredReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(bellFiredReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        teardown();
        if (bellFiredReceiver != null) {
            try {
                getContext().unregisterReceiver(bellFiredReceiver);
            } catch (IllegalArgumentException ignored) {
                // Already unregistered.
            }
            bellFiredReceiver = null;
        }
        super.handleOnDestroy();
    }

    @PluginMethod
    public void start(PluginCall call) {
        try {
            // A fresh start replaces any previous schedule (pause -> resume).
            teardown();

            JSArray bells = call.getArray("bells", new JSArray());
            int count = Math.min(bells.length(), MAX_BELLS);
            if (bells.length() > MAX_BELLS) {
                Log.w(TAG, "Bell plan truncated to " + MAX_BELLS + " (got " + bells.length() + ")");
            }

            AlarmManager alarmManager =
                (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            boolean canExact = Build.VERSION.SDK_INT < Build.VERSION_CODES.S
                || alarmManager.canScheduleExactAlarms();

            for (int i = 0; i < count; i++) {
                JSONObject bell = bells.getJSONObject(i);
                PendingIntent pending = bellPendingIntent(
                    i,
                    bell.getString("soundPath"),
                    (float) bell.getDouble("volume"),
                    bell.getString("key")
                );
                long at = bell.getLong("at");
                if (canExact) {
                    alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
                } else {
                    // Exact-alarm permission revoked (possible on Android 12):
                    // degrade to inexact rather than fail — the end-of-session
                    // notification still marks completion.
                    alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pending);
                }
            }

            JSObject ambient = call.getObject("ambient", null);
            if (ambient != null) {
                Intent serviceIntent = new Intent(getContext(), SessionAudioService.class);
                serviceIntent.setAction(SessionAudioService.ACTION_START);
                serviceIntent.putExtra(
                    SessionAudioService.EXTRA_AMBIENT_PATH, ambient.getString("soundPath"));
                serviceIntent.putExtra(
                    SessionAudioService.EXTRA_AMBIENT_VOLUME,
                    (float) ambient.optDouble("volume", 1.0));
                serviceIntent.putExtra(
                    SessionAudioService.EXTRA_TITLE, call.getString("serviceTitle", ""));
                serviceIntent.putExtra(
                    SessionAudioService.EXTRA_TEXT, call.getString("serviceText", ""));
                getContext().startForegroundService(serviceIntent);
            }

            call.resolve();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start session audio", e);
            teardown();
            call.reject("Failed to start session audio: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        teardown();
        call.resolve();
    }

    private void teardown() {
        cancelAllBellAlarms();
        Intent serviceIntent = new Intent(getContext(), SessionAudioService.class);
        getContext().stopService(serviceIntent);
    }

    private PendingIntent bellPendingIntent(int index, String soundPath, float volume, String key) {
        Intent intent = new Intent(getContext(), BellAlarmReceiver.class);
        intent.setAction(BellAlarmReceiver.ACTION_RING_BELL);
        intent.putExtra(BellAlarmReceiver.EXTRA_SOUND_PATH, soundPath);
        intent.putExtra(BellAlarmReceiver.EXTRA_VOLUME, volume);
        intent.putExtra(BellAlarmReceiver.EXTRA_BELL_KEY, key);
        return PendingIntent.getBroadcast(
            getContext(),
            REQUEST_CODE_BASE + index,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private void cancelAllBellAlarms() {
        AlarmManager alarmManager =
            (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
        for (int i = 0; i < MAX_BELLS; i++) {
            // Recreate an equivalent PendingIntent purely to cancel it.
            Intent intent = new Intent(getContext(), BellAlarmReceiver.class);
            intent.setAction(BellAlarmReceiver.ACTION_RING_BELL);
            PendingIntent pending = PendingIntent.getBroadcast(
                getContext(),
                REQUEST_CODE_BASE + i,
                intent,
                PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
            );
            if (pending != null) {
                alarmManager.cancel(pending);
                pending.cancel();
            }
        }
    }
}
