const MAX_DIMENSION = 1280;
const MAX_BYTES = 1_000_000;
const START_QUALITY = 0.82;

export type CompressedImage = {
  base64: string;
  width: number;
  height: number;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export async function compressImage(
  file: File | Blob,
  quality = START_QUALITY,
): Promise<CompressedImage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

  const img = await loadImage(dataUrl);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, 0, 0, width, height);

  let out = canvas.toDataURL("image/jpeg", quality);
  let bytes = Math.round((out.length * 3) / 4);

  // Iteratively drop quality until under the 1MB limit.
  while (bytes > MAX_BYTES && quality > 0.3) {
    quality -= 0.12;
    out = canvas.toDataURL("image/jpeg", quality);
    bytes = Math.round((out.length * 3) / 4);
  }

  return { base64: out, width, height };
}
