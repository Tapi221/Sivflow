import PencilKit
import React
import UIKit

@objc(SivflowPencilKitCanvasView)
final class SivflowPencilKitCanvasView: UIView, PKCanvasViewDelegate {
  @objc var onStrokeComplete: RCTDirectEventBlock?
  private let canvas = PKCanvasView()
  private var strokeCount = 0

  override init(frame: CGRect) {
    super.init(frame: frame)
    setUpCanvas()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setUpCanvas()
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    canvas.frame = bounds
  }

  private func setUpCanvas() {
    canvas.backgroundColor = .clear
    canvas.drawingPolicy = .anyInput
    canvas