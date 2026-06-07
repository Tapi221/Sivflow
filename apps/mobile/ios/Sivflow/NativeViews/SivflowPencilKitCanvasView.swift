import PencilKit
import UIKit

@objc(SivflowPencilKitCanvasView)
final class SivflowPencilKitCanvasView: UIView {
  private let canvasView = PKCanvasView()

  override init(frame: CGRect) {
    super.init(frame: frame)
    setupCanvasView()
  }

  required init?(coder: NSCoder) {
    super.init(coder: coder)
    setupCanvasView()
  }

  private func setupCanvasView() {
    canvasView.translatesAutoresizingMaskIntoConstraints = false
    canvasView.backgroundColor = .clear
    canvasView