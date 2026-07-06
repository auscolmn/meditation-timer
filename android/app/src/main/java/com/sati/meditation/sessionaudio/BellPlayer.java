package com.sati.meditation.sessionaudio;

import android.content.Context;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.util.Log;

/**
 * One-shot bell playback shared by the foreground service (ambient sessions)
 * and the alarm receiver (silent sessions).
 *
 * Sound paths come from JS in two forms:
 *   "asset:sounds/bell.mp3"  -> bundled sound; the web build is copied into
 *                               Android assets under "public/", so the real
 *                               asset path is "public/sounds/bell.mp3"
 *   "file:///..."            -> a custom sound in the app's data directory
 *                               (Capacitor Filesystem, Part 6)
 */
final class BellPlayer {

    private static final String TAG = "SatiBellPlayer";
    static final String ASSET_PREFIX = "asset:";

    private BellPlayer() {}

    static AudioAttributes playbackAttributes() {
        return new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build();
    }

    /**
     * Plays a bell once and releases the player when done. Never throws:
     * a bell that cannot play must not take the session (or the alarm
     * receiver) down with it.
     *
     * @return the started MediaPlayer, or null if playback could not start.
     */
    static MediaPlayer play(Context context, String soundPath, float volume, Runnable onDone) {
        MediaPlayer player = new MediaPlayer();
        try {
            player.setAudioAttributes(playbackAttributes());
            setDataSource(context, player, soundPath);
            player.setVolume(volume, volume);
            player.setOnCompletionListener(mp -> {
                mp.release();
                if (onDone != null) onDone.run();
            });
            player.setOnErrorListener((mp, what, extra) -> {
                Log.e(TAG, "Bell playback error " + what + "/" + extra + " for " + soundPath);
                mp.release();
                if (onDone != null) onDone.run();
                return true;
            });
            player.prepare();
            player.start();
            return player;
        } catch (Exception e) {
            Log.e(TAG, "Failed to play bell " + soundPath, e);
            player.release();
            if (onDone != null) onDone.run();
            return null;
        }
    }

    static void setDataSource(Context context, MediaPlayer player, String soundPath) throws Exception {
        if (soundPath.startsWith(ASSET_PREFIX)) {
            String assetPath = "public/" + soundPath.substring(ASSET_PREFIX.length());
            try (AssetFileDescriptor afd = context.getAssets().openFd(assetPath)) {
                player.setDataSource(afd.getFileDescriptor(), afd.getStartOffset(), afd.getLength());
            }
        } else {
            player.setDataSource(context, Uri.parse(soundPath));
        }
    }
}
