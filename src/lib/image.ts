// Image compression helper.
// - Accepts files up to MAX_INPUT_MB (covers modern phone photos).
// - Resizes longest side to maxDim and re-encodes as JPEG with target quality.
// - Returns a new File ready to upload.

const MAX_INPUT_MB = 20;

export interface CompressOptions {
  maxDim?: number; // longest side in px
  quality?: number; // 0..1
  mimeType?: string; // output mime
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file; // keep animation

  if (file.size > MAX_INPUT_MB * 1024 * 1024) {
    throw new Error(`Imagem muito grande (máx ${MAX_INPUT_MB}MB)`);
  }

  const { maxDim = 1600, quality = 0.82, mimeType = "image/jpeg" } = opts;

  const bitmap = await loadBitmap(file);
  const { width, height } = fit(bitmap.width, bitmap.height, maxDim);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  if ("close" in bitmap) (bitmap as ImageBitmap).close();

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, mimeType, quality),
  );
  if (!blob) return file;

  // If compression made it bigger (small image already), keep original.
  if (blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: mimeType, lastModified: Date.now() });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      /* fallback */
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function fit(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}
