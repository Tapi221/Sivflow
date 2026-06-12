import type { SelectionCaptureRect } from "./selectionCapture.types";



const toBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("Failed to create image blob."));
    }, "image/png");
  });
};
const inlineComputedStyles = (source: Element, clone: Element): void => {
  if (source instanceof HTMLElement && clone instanceof HTMLElement) {
    const computedStyle = window.getComputedStyle(source);
    for (let index = 0; index < computedStyle.length; index += 1) {
      const propertyName = computedStyle.item(index);
      clone.style.setProperty(
        propertyName,
        computedStyle.getPropertyValue(propertyName),
        computedStyle.getPropertyPriority(propertyName),
      );
    }
  }

  const sourceChildren = Array.from(source.children);
  const cloneChildren = Array.from(clone.children);
  sourceChildren.forEach((sourceChild, index) => {
    const cloneChild = cloneChildren[index];
    if (cloneChild) {
      inlineComputedStyles(sourceChild, cloneChild);
    }
  });
};
const cloneElementForCapture = (element: HTMLElement): HTMLElement => {
  const clone = element.cloneNode(true) as HTMLElement;
  inlineComputedStyles(element, clone);
  clone.querySelectorAll("[data-selection-capture-ignore='true']").forEach((node) => {
    node.remove();
  });
  return clone;
};
const captureElementRectToBlob = async (element: HTMLElement, rect: SelectionCaptureRect): Promise<Blob> => {
  const bounds = element.getBoundingClientRect();
  const clone = cloneElementForCapture(element);
  const wrapper = document.createElement("div");
  const serializedRect = {
    x: Math.max(0, Math.round(rect.x)),
    y: Math.max(0, Math.round(rect.y)),
    width: Math.max(1, Math.round(rect.width)),
    height: Math.max(1, Math.round(rect.height)),
  };

  wrapper.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  wrapper.style.width = `${bounds.width}px`;
  wrapper.style.height = `${bounds.height}px`;
  wrapper.style.transform = `translate(${-serializedRect.x}px, ${-serializedRect.y}px)`;
  wrapper.style.transformOrigin = "top left";
  wrapper.appendChild(clone);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${serializedRect.width}" height="${serializedRect.height}"><foreignObject width="${bounds.width}" height="${bounds.height}">${new XMLSerializer().serializeToString(wrapper)}</foreignObject></svg>`;
  const image = new Image();
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to render selected DOM area."));
      image.src = url;
    });

    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = serializedRect.width;
    outputCanvas.height = serializedRect.height;
    const context = outputCanvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is not available.");
    }

    context.drawImage(image, 0, 0);
    return toBlob(outputCanvas);
  } finally {
    URL.revokeObjectURL(url);
  }
};



export { captureElementRectToBlob };
