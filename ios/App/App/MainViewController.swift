import UIKit
import Capacitor

/**
 * Registers Sati's in-tree Capacitor plugins (Part 9). Referenced as the
 * view controller's custom class in Main.storyboard.
 *
 * ⚠️ UNTESTED: written without access to a Mac/Xcode. See BUILDING.md.
 */
class MainViewController: CAPBridgeViewController {

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(SessionAudioPlugin())
    }
}
