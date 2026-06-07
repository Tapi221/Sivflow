import PencilKit
import React
import UIKit

@objc(SivflowPencilKitCanvasView)
final class SivflowPencilKitCanvasView: UIView, PKCanvasViewDelegate {
  @objc var onStrokeComplete: RCTDirectEventBlock?
  private let canvas = PKCanvasView()
  private var count = 0
  override init(frame: CGRect) { super.init(frame: frame); setup() }
  required init?(coder: NSCoder) { super.init(coder: coder); setup() }
  override func layoutSubviews() {