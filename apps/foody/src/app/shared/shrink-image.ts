/** The longer side of a photo, which is plenty to recognize a product */
const MAX_SIDE = 1600;
const QUALITY = 0.85;
/** Photos up to this size are kept as they are */
const SMALL_ENOUGH = 400 * 1024;

/**
 * Makes a photo small enough to be stored and sent: a phone takes photos of
 * many megabytes, more than the server accepts for a file and far more than
 * is needed here. A file that cannot be read as an image is returned as it
 * is.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (file.size <= SMALL_ENOUGH || !file.type.startsWith('image/')) return file;

  try {
    // Turned the way it was taken, as the note about that gets lost
    const image = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    canvas
      .getContext('2d')
      ?.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]*$/, '') + '.jpg', {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
