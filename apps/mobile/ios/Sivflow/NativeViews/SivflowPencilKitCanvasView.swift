import PencilKit
import UIKit

@objc(SivflowPencilKitCanvasView)
final class SivflowPencilKitCanvasView: UIView {
  private let canvas = PKCanvasView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    addSubview(canvas)
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    addSubview(canvas)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    canvas.frame = bounds
  }
}
