const getTextColorDerivedBackgroundColor = (rgb: readonly [number, number, number], alpha = 0.12): string => `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;



export { getTextColorDerivedBackgroundColor };
