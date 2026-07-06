package com.sati.meditation.sessionaudio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/**
 * Foreground service that keeps ambient audio playing while the screen is
 * locked. Started only for sessions WITH ambient sound — that continuous,
 * genuinely audible playback is what makes the mediaPlayback service type
 * honest under Play policy. Bells are NOT this service's job; they ride
 * exact alarms (see BellAlarmReceiver) in every session mode.
 *
 * The service lives strictly for the session: started when the meditation
 * phase begins, stopped on pause / session end / app teardown. If the user
 * swipes the app away mid-session, onTaskRemoved shuts it down.
 */
public class SessionAudioService extends Service {

    private static final String TAG = "SatiSessionAudio";

    static final String ACTION_START = "com.sati.meditation.session.START";
    static final String ACTION_STOP = "com.sati.meditation.session.STOP";
    static final String EXTRA_AMBIENT_PATH = "ambientPath";
    static final String EXTRA_AMBIENT_VOLUME = "ambientVolume";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_TEXT = "text";

    /** Ongoing-notification channel — distinct from the end-of-session channel. */
    private static final String SERVICE_CHANNEL_ID = "sati_session_service";
    private static final int SERVICE_NOTIFICATION_ID = 2001;

    private MediaPlayer ambientPlayer;
    private AudioManager audioManager;
    private AudioFocusRequest focusRequest;
    private float ambientVolume = 1f;

    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        if (ambientPlayer == null) return;
        try {
            switch (change) {
                case AudioManager.AUDIOFOCUS_LOSS:
                    // Another app took over for good (music app, etc.) —
                    // stop ambient; the session itself continues and bells
                    // still ring from their alarms.
                    stopAmbient();
                    break;
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT:
                    if (ambientPlayer.isPlaying()) ambientPlayer.pause();
                    break;
                case AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK:
                    ambientPlayer.setVolume(ambientVolume * 0.2f, ambientVolume * 0.2f);
                    break;
                case AudioManager.AUDIOFOCUS_GAIN:
                    ambientPlayer.setVolume(ambientVolume, ambientVolume);
                    if (!ambientPlayer.isPlaying()) ambientPlayer.start();
                    break;
                default:
                    break;
            }
        } catch (IllegalStateException e) {
            Log.w(TAG, "Focus change on released player", e);
        }
    };

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null || ACTION_STOP.equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }

        String title = intent.getStringExtra(EXTRA_TITLE);
        String text = intent.getStringExtra(EXTRA_TEXT);
        startInForeground(
            title != null ? title : "Meditation in progress",
            text != null ? text : ""
        );

        String ambientPath = intent.getStringExtra(EXTRA_AMBIENT_PATH);
        ambientVolume = intent.getFloatExtra(EXTRA_AMBIENT_VOLUME, 1f);
        if (ambientPath != null) {
            startAmbient(ambientPath);
        }

        return START_NOT_STICKY;
    }

    private void startInForeground(String title, String text) {
        NotificationManager manager = getSystemService(NotificationManager.class);
        NotificationChannel channel = new NotificationChannel(
            SERVICE_CHANNEL_ID,
            "Meditation session",
            NotificationManager.IMPORTANCE_LOW // silent, no heads-up
        );
        channel.setDescription("Shown while a meditation session is running");
        channel.setShowBadge(false);
        manager.createNotificationChannel(channel);

        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent contentIntent = launchIntent == null ? null : PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
            .setSmallIcon(getResources().getIdentifier("ic_stat_sati", "drawable", getPackageName()))
            .setContentTitle(title)
            .setContentText(text)
            .setContentIntent(contentIntent)
            .setOngoing(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build();

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
            : 0;
        ServiceCompat.startForeground(this, SERVICE_NOTIFICATION_ID, notification, type);
    }

    private void startAmbient(String soundPath) {
        stopAmbient();

        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        focusRequest = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(BellPlayer.playbackAttributes())
            .setOnAudioFocusChangeListener(focusListener)
            .build();
        int focus = audioManager.requestAudioFocus(focusRequest);
        if (focus != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            Log.w(TAG, "Audio focus not granted; ambient will not play");
            return;
        }

        ambientPlayer = new MediaPlayer();
        try {
            ambientPlayer.setAudioAttributes(BellPlayer.playbackAttributes());
            BellPlayer.setDataSource(this, ambientPlayer, soundPath);
            ambientPlayer.setLooping(true);
            ambientPlayer.setVolume(ambientVolume, ambientVolume);
            ambientPlayer.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "Ambient playback error " + what + "/" + extra);
                stopAmbient();
                return true;
            });
            ambientPlayer.prepare();
            ambientPlayer.start();
        } catch (Exception e) {
            Log.e(TAG, "Failed to start ambient audio " + soundPath, e);
            stopAmbient();
        }
    }

    private void stopAmbient() {
        if (ambientPlayer != null) {
            try {
                ambientPlayer.stop();
            } catch (IllegalStateException ignored) {
                // Never prepared/started — releasing is all that matters.
            }
            ambientPlayer.release();
            ambientPlayer = null;
        }
        if (audioManager != null && focusRequest != null) {
            audioManager.abandonAudioFocusRequest(focusRequest);
            focusRequest = null;
        }
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // App swiped away mid-session: the session is over.
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopAmbient();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }
}
