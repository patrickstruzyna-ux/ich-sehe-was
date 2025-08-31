
// Generates a series of distinct colors with transparency for masks.
export const generateMaskColors = (count: number): string[] => {
  const colors: string[] = [];
  const saturation = 70;
  const lightness = 50;
  const alpha = 0.6; // 60% opacity

  for (let i = 0; i < count; i++) {
    const hue = (i * 360) / (count + 1);
    colors.push(`hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`);
  }
  return colors;
};
