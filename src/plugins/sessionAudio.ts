import { registerPlugin } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import type { SessionAudioPlan } from '../utils/sessionAudioPlan';

/**
 * SessionAudio — the native background-audio pipeline (Part 9).
 *
 * The implementations live in the native projects (in-tree custom plugin,
 * no npm dependency):
 *   android/app/src/main/java/com/sati/meditation/sessionaudio/
 *   ios/App/App/SessionAudioPlugin.swift
 *
 * Contract:
 * - `start` hands native an absolute-timestamp bell schedule plus optional
 *   looping ambient audio. Native owns ringing from that moment on.
 * - Every bell that rings natively is reported via the 'bellFired' event.
 *   Events can be LOST while the WebView is suspended (Capacitor does not
 *   retain them), so JS must never depend on receiving one — native is
 *   authoritative for what rang; JS bookkeeping is best-effort cosmetic.
 * - `stop` tears everything down (players, timers/alarms, foreground
 *   service). Called on pause, session end, and unmount. Idempotent.
 *
 * Android: ambient plays in a mediaPlayback foreground service (lives only
 * for the session); bells ride AlarmManager exact wake-up alarms in BOTH
 * modes, because Handler timers pause in deep sleep. iOS: AVAudioSession
 * .playback + UIBackgroundModes audio keeps the app alive while ambient
 * plays, and wall-deadline timers ring the bells; without ambient, iOS
 * suspends the app and this pipeline is not used (the end-of-session
 * notification carries the bell sound instead — see notificationSetup.ts).
 */

export interface BellFiredEvent {
  /** PlannedBell.key of the bell that rang. */
  key: string;
}

export interface StartSessionOptions extends SessionAudioPlan {
  /** Title for the Android foreground-service notification. */
  serviceTitle: string;
  /** Body text for the Android foreground-service notification. */
  serviceText: string;
}

export interface SessionAudioPlugin {
  start(options: StartSessionOptions): Promise<void>;
  stop(): Promise<void>;
  addListener(
    eventName: 'bellFired',
    listener: (event: BellFiredEvent) => void
  ): Promise<PluginListenerHandle>;
  removeAllListeners(): Promise<void>;
}

/**
 * Web no-op. The web build keeps the existing in-page pipeline
 * (HTMLAudioElement bells + WebAudio ambient) — callers gate on
 * Capacitor.isNativePlatform() before starting this plugin, so the no-op
 * exists only so an accidental call can never throw.
 */
class SessionAudioWeb implements SessionAudioPlugin {
  async start(): Promise<void> { /* no-op on web */ }
  async stop(): Promise<void> { /* no-op on web */ }
  async addListener(): Promise<PluginListenerHandle> {
    return { remove: async () => { /* no-op on web */ } };
  }
  async removeAllListeners(): Promise<void> { /* no-op on web */ }
}

const SessionAudio = registerPlugin<SessionAudioPlugin>('SessionAudio', {
  web: () => new SessionAudioWeb()
});

export default SessionAudio;
