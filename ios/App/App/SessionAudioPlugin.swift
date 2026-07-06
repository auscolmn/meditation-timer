import Foundation
import AVFoundation
import Capacitor

/**
 * SessionAudio (Part 9): native ownership of the locked-screen session
 * schedule on iOS.
 *
 * ⚠️ UNTESTED: written without access to a Mac/Xcode. Review and device-test
 * before any App Store submission. See BUILDING.md ("iOS status").
 *
 * How it stays alive: UIBackgroundModes "audio" (Info.plist) plus an active
 * AVAudioSession in the .playback category keep the app running in the
 * background — but ONLY while audio is genuinely playing. That is why JS
 * starts this pipeline solely for sessions WITH ambient sound; a silent sit
 * is suspended on lock regardless, and its ending bell rides the local
 * notification's sound instead (see notificationSetup.ts).
 *
 * .playback also means bells and ambient ignore the silent switch — the
 * settled product decision: a deliberately started meditation session must
 * be able to ring its bell.
 *
 * Bells are scheduled on DispatchSourceTimers with WALL deadlines
 * (wall-clock survives device sleep; .now()+delta on the monotonic clock
 * would drift, mirroring the uptimeMillis trap on Android).
 */
@objc(SessionAudioPlugin)
public class SessionAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SessionAudioPlugin"
    public let jsName = "SessionAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise)
    ]

    private static let assetPrefix = "asset:"

    private var ambientPlayer: AVAudioPlayer?
    private var bellPlayers: [AVAudioPlayer] = []
    private var bellTimers: [DispatchSourceTimer] = []
    private let queue = DispatchQueue(label: "com.sati.meditation.sessionaudio")

    @objc func start(_ call: CAPPluginCall) {
        queue.async {
            self.teardown()

            do {
                let session = AVAudioSession.sharedInstance()
                try session.setCategory(.playback, mode: .default)
                try session.setActive(true)
            } catch {
                call.reject("Failed to activate audio session: \(error.localizedDescription)")
                return
            }

            if let ambient = call.getObject("ambient"),
               let path = ambient["soundPath"] as? String,
               let url = self.resolveURL(path) {
                let volume = (ambient["volume"] as? NSNumber)?.floatValue ?? 1.0
                do {
                    let player = try AVAudioPlayer(contentsOf: url)
                    player.numberOfLoops = -1
                    player.volume = volume
                    player.prepareToPlay()
                    player.play()
                    self.ambientPlayer = player
                } catch {
                    CAPLog.print("SessionAudio: ambient failed to play: \(error)")
                }
            }

            let bells = call.getArray("bells") ?? []
            let nowMs = Date().timeIntervalSince1970 * 1000
            for case let bell as [String: Any] in bells {
                guard
                    let key = bell["key"] as? String,
                    let at = (bell["at"] as? NSNumber)?.doubleValue,
                    let soundPath = bell["soundPath"] as? String,
                    let url = self.resolveURL(soundPath)
                else { continue }
                let volume = (bell["volume"] as? NSNumber)?.floatValue ?? 0.8
                let delaySeconds = max(0, (at - nowMs) / 1000)

                let timer = DispatchSource.makeTimerSource(queue: self.queue)
                timer.schedule(wallDeadline: .now() + delaySeconds)
                timer.setEventHandler { [weak self] in
                    self?.ringBell(url: url, volume: volume, key: key)
                }
                timer.resume()
                self.bellTimers.append(timer)
            }

            call.resolve()
        }
    }

    @objc func stop(_ call: CAPPluginCall) {
        queue.async {
            self.teardown()
            call.resolve()
        }
    }

    private func ringBell(url: URL, volume: Float, key: String) {
        do {
            let player = try AVAudioPlayer(contentsOf: url)
            player.volume = volume
            player.prepareToPlay()
            player.play()
            bellPlayers.append(player)
            // Trim finished players (a session rings at most a handful).
            bellPlayers.removeAll { !$0.isPlaying && $0 !== player }
        } catch {
            CAPLog.print("SessionAudio: bell \(key) failed to play: \(error)")
        }
        notifyListeners("bellFired", data: ["key": key])
    }

    private func teardown() {
        for timer in bellTimers { timer.cancel() }
        bellTimers.removeAll()
        ambientPlayer?.stop()
        ambientPlayer = nil
        for player in bellPlayers { player.stop() }
        bellPlayers.removeAll()
        do {
            try AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
        } catch {
            CAPLog.print("SessionAudio: failed to deactivate audio session: \(error)")
        }
    }

    /// "asset:sounds/bell.mp3" -> <bundle>/public/sounds/bell.mp3 (Capacitor
    /// copies webDir into the bundle's "public" folder); "file://..." -> as-is.
    private func resolveURL(_ soundPath: String) -> URL? {
        if soundPath.hasPrefix(Self.assetPrefix) {
            let relative = String(soundPath.dropFirst(Self.assetPrefix.count))
            return Bundle.main.url(forResource: "public/\(relative)", withExtension: nil)
        }
        return URL(string: soundPath)
    }
}
