interface ResizeOptions {
  /** How to fit the image into the target dimensions. Defaults to `"cover"`. */
  fit?: "cover" | "contain" | "scale-down";
  /** Encoding quality from 0–1. Defaults to `0.85`. Ignored for `"image/png"`. */
  quality?: number;
  /** Output MIME type. Defaults to `"image/jpeg"`. */
  format?: "image/jpeg" | "image/png" | "image/webp";
}

/**
 * Resizes a File or Blob using the Canvas API and returns the result as a new Blob.
 *
 * - `"cover"` (default): scales and center-crops to fill the exact target size.
 * - `"contain"`: scales to fit within the target size, letterboxing as needed.
 * - `"scale-down"`: scales proportionally to fit within width × height without
 *   upscaling; the output canvas is sized to the actual scaled dimensions (no padding).
 *
 * Only available in browser contexts (requires Canvas, Image, and URL APIs).
 */
export function resizeImage(
  source: File | Blob,
  width: number,
  height: number,
  options: ResizeOptions = {}
): Promise<Blob> {
  const { fit = "cover", quality = 0.85, format = "image/jpeg" } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(source);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get 2d canvas context"));
        return;
      }

      if (fit === "cover") {
        canvas.width = width;
        canvas.height = height;
        const scale = Math.max(width / img.width, height / img.height);
        const sw = width / scale;
        const sh = height / scale;
        const sx = (img.width - sw) / 2;
        const sy = (img.height - sh) / 2;
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);
      } else if (fit === "contain") {
        canvas.width = width;
        canvas.height = height;
        const scale = Math.min(width / img.width, height / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        const dx = (width - dw) / 2;
        const dy = (height - dh) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
      } else {
        // scale-down: proportional, no upscaling, canvas sized to actual output
        const scale = Math.min(1, Math.min(width / img.width, height / img.height));
        const dw = Math.round(img.width * scale);
        const dh = Math.round(img.height * scale);
        canvas.width = dw;
        canvas.height = dh;
        ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, dw, dh);
      }

      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("canvas.toBlob returned null")),
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for resizing"));
    };

    img.src = url;
  });
}
