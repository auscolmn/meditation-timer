package com.sati.meditation;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.sati.meditation.sessionaudio.SessionAudioPlugin;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // In-tree custom plugins must be registered before the bridge loads.
        registerPlugin(SessionAudioPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
