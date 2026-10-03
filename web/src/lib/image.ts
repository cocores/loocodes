/** Reads a chosen file, center-crops it to a square, and downsizes it to a
 * small JPEG data URL — a full-resolution phone photo read directly via
 * FileReader can be several MB, far past what's sane to store on a
 * Firestore document (firestore.rules caps avatarPhoto at 400,000 chars).
 * A 256x256 JPEG at this quality is typically well under 50KB. */
export async function resizeImageToDataUrl(
  file: File,
  size = 256,
  quality = 0.72,
): Promise<string> {
  const sourceUrl = await readFileAsDataUrl(file);
  const img = await loadImage(sourceUrl);

  const side = Math.min(img.width, img.height);
  const sx = (img.width - side) / 2;
  const sy = (img.height - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  return canvas.toDataURL("image/jpeg", quality);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = src;
  });
}
