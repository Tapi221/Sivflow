import PencilKit
import UIKit

@objc(SivflowPencilKitCanvasView)
final class SivflowPencilKitCanvasView: UIView {
  private let canvas = PKCanvasView()
  override init(frame: CGRect) { super.init(frame: frame); setup() }
  required init?(coder: NSCoder) { super.init(coder: coder); setup() }
  private func setup() { canvas.frame = bounds; canvas.autoresizingMask = [.flexibleWidth, .flexibleHeight]; addSubview(canvas) }
}
