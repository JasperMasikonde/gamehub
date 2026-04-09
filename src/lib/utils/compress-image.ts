const MAX_DIMENSION = 1920;
const QUALITY = 0.82;

/**
 * Compress an image file client-side using the Canvas API before uploading.
 * - Resizes so neither dimension exceeds MAX_DIMENSION (preserves aspect ratio).
 * - Outputs WebP at QUALITY if the browser supports it, otherwise JPEG.
 * - Returns the original file unchanged if compression produces a larger result.
 */
export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Try WebP first, fall back to JPEG
      const tryWebP = () =>
        new Promise<Blob | null>((res) =>
          canvas.toBlob(res, "image/webp", QUALITY)
        );
      const tryJpeg = () =>
        new Promise<Blob | null>((res) =>
          canvas.toBlob(res, "image/jpeg", QUALITY)
        );

      tryWebP().then((webpBlob) => {
        const useWebP = webpBlob && webpBlob.size > 0 && webpBlob.type === "image/webp";
        const blobPromise = useWebP ? Promise.resolve(webpBlob!) : tryJpeg();

        blobPromise.then((blob) => {
          if (!blob) { resolve(file); return; }

          // Only use the compressed version if it's actually smaller
          if (blob.size >= file.size) { resolve(file); return; }

          const ext = useWebP ? "webp" : "jpg";
          const baseName = file.name.replace(/\.[^.]+$/, "");
          const compressed = new File([blob], `${baseName}.${ext}`, {
            type: blob.type,
            lastModified: Date.now(),
          });

          resolve(compressed);
        });
      }).catch(() => resolve(file));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // upload original on error
    };

    img.src = objectUrl;
  });
}
