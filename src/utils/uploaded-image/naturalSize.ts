export type ImageNaturalSize = {
  naturalW: number;
  naturalH: number;
};

const hasNaturalSize = (
  image: {
    naturalWidth: number;
    naturalHeight: number;
  }
) => {
  return image.naturalWidth > 0 && image.naturalHeight > 0;
};

export const loadImageNaturalSize = (src: string) => {
  if (typeof Image === "undefined") return null;
  if (typeof src !== "string" || src.trim().length === 0) return null;

  return await new Promise((resolve) => {
    const image = new Image();
    let settled = false;

    const finish = (value: ImageNaturalSize | null) => {
      if (settled) return;
      settled = true;
      image.onload = null;
      image.onerror = null;
      resolve(value);
    };

    image.onload = () => {
      if (!hasNaturalSize(image)) {
        finish(null);
        return;
      }

      finish({
        naturalW: image.naturalWidth,
        naturalH: image.naturalHeight,
      });
    };

    image.onerror = () => finish(null);
    image.src = src;

    if (image.complete && hasNaturalSize(image)) {
      finish({
        naturalW: image.naturalWidth,
        naturalH: image.naturalHeight,
      });
    }
  });
};
