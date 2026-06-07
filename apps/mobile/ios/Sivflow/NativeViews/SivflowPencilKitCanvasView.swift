import PencilKit
import React
import UIKit
@objc(SivflowPencilKitCanvasView) final class SivflowPencilKitCanvasView: UIView { @objc var onStrokeComplete: RCTDirectEventBlock?; private let canvas = PKCanvasView(); override init(frame: CGRect) { super.init(frame: frame); addSubview(canvas) }; required init?(coder: NSCoder) { super.init(coder: coder); addSubview(canvas) }; override func layoutSubviews() { super.layoutSubviews(); canvas.frame = bounds } }
