import Foundation
import React

@objc(SivflowPencilKitCanvasManager)
final class SivflowPencilKitCanvasManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool { true }
  override func view() -> UIView! { SivflowPencilKitCanvasView() }
}
