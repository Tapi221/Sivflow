import PencilKit
import React
import UIKit

@objc(SivflowPencilKitCanvasView)
final class SivflowPencilKitCanvasView: UIView, PKCanvasViewDelegate {
  private let canvas = PKCanvasView()
  @objc var onStrokeComplete: RCTBubblingEventBlock?
  override init(frame: CGRect) { super.init(frame: frame); setup() }
  required init?(coder: NSCoder) { super.init(coder: coder); setup() }
  private func setup() { canvas.frame