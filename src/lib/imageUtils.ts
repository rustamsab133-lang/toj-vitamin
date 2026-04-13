/**
 * Сжимает изображение до целевого размера в КБ, уменьшая его качество и/или разрешение.
 * @param file Оригинальный файл (Blob/File)
 * @param maxKb Целевой размер в КБ (например, 200)
 * @returns Сжатое изображение (Blob)
 */
export async function compressImage(file: File, maxKb: number = 200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Если фото слишком крупное (например, 4K+), уменьшаем до разумного HD (1280px по длинной стороне)
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Рекурсивный подбор качества (начинаем с высокого 0.8)
        let quality = 0.8;
        const targetSize = maxKb * 1024;

        const checkQuality = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas toBlob failed'));
                return;
              }
              // Если размер все еще больше целевого и качество > 0.1, пробуем еще
              if (blob.size > targetSize && q > 0.1) {
                checkQuality(q - 0.1);
              } else {
                resolve(blob);
              }
            },
            'image/jpeg',
            q
          );
        };

        checkQuality(quality);
      };
      img.onerror = () => reject(new Error('Image failed to load'));
    };
    reader.onerror = () => reject(new Error('File reader failed'));
  });
}
