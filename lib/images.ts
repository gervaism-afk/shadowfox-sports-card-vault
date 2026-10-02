export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function validateImageFile(file: Pick<File, "size" | "type">) {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Choose an image smaller than 12 MB.");
}

export async function prepareCardImage(file: File): Promise<string> {
  validateImageFile(file);
  const image = await createImageBitmap(file);
  try {
    if (!image.width || !image.height || image.width * image.height > 50_000_000) throw new Error("This image is too large. Try a smaller photo.");
    const scale = Math.min(1, 2200 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not prepare this image.");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  } finally {
    image.close();
  }
}

// Only delete images from the configured project's bucket and the owner's folder.
export function imageObjectPath(imageUrl: string, userId: string, projectUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    if (url.origin !== new URL(projectUrl).origin) return null;
    const prefix = "/storage/v1/object/public/card-images/";
    if (!url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    const parts = path.split("/");
    if (parts.length !== 3 || parts[0] !== userId || !["front", "back"].includes(parts[1])) return null;
    if (!parts[2] || parts.some((part) => part === "." || part === ".." || part.includes("\\"))) return null;
    return path;
  } catch { return null; }
}
