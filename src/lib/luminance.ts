export function luminanceFromDataUrl(dataUrl: string): number {
  const img = new Image();
  img.src = dataUrl;
  const canvas = document.createElement("canvas");
  const size = 48;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0.5;
  ctx.drawImage(img, 0, 0, size, size);
  let pixels: ImageData;
  try {
    pixels = ctx.getImageData(0, 0, size, size);
  } catch {
    return 0.5;
  }
  const data = pixels.data;
  let sum = 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    sum += (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  return sum / (data.length / 4);
}
