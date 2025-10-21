import type { PPMImage } from "../types/types";

export const parsePPM = async (file: File): Promise<PPMImage> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(buffer);

        let position = 0;
        let format: "P3" | "P6" = "P6";

        const formatStr = String.fromCharCode(bytes[0], bytes[1]);
        if (formatStr === "P3") {
          format = "P3";
        } else if (formatStr === "P6") {
          format = "P6";
        } else {
          throw new Error("Nieprawidłowy format pliku PPM (oczekiwano P3 lub P6)");
        }
        position = 2;

        const skipWhitespaceAndComments = () => {
          while (position < bytes.length) {
            while (
              position < bytes.length &&
              (bytes[position] === 32 || bytes[position] === 10 || bytes[position] === 13 || bytes[position] === 9)
            ) {
              position++;
            }

            if (bytes[position] === 35) {
              // '#'
              while (position < bytes.length && bytes[position] !== 10) {
                position++;
              }
            } else {
              break;
            }
          }
        };

        const readNumber = (): number => {
          skipWhitespaceAndComments();
          let numStr = "";
          while (position < bytes.length && bytes[position] >= 48 && bytes[position] <= 57) {
            numStr += String.fromCharCode(bytes[position]);
            position++;
          }
          return parseInt(numStr);
        };

        const width = readNumber();
        const height = readNumber();
        const maxValue = readNumber();

        skipWhitespaceAndComments();

        if (width <= 0 || height <= 0 || maxValue <= 0) {
          throw new Error("Nieprawidłowe wymiary lub maxValue w pliku PPM");
        }

        if (maxValue > 65535) {
          throw new Error("MaxValue przekracza 65535");
        }

        const bytesPerComponent = maxValue < 256 ? 1 : 2;
        const totalPixels = width * height;
        const expectedBytes = totalPixels * 3 * bytesPerComponent;

        const pixels = new Uint8ClampedArray(totalPixels * 4); // RGBA

        if (format === "P6") {
          const dataStart = position;
          const availableBytes = bytes.length - dataStart;

          if (availableBytes < expectedBytes) {
            throw new Error(`Uszkodzony plik: oczekiwano ${expectedBytes} bajtów, otrzymano ${availableBytes}`);
          }

          for (let i = 0; i < totalPixels; i++) {
            let r, g, b;

            if (bytesPerComponent === 1) {
              r = bytes[dataStart + i * 3];
              g = bytes[dataStart + i * 3 + 1];
              b = bytes[dataStart + i * 3 + 2];
            } else {
              r = (bytes[dataStart + i * 6] << 8) | bytes[dataStart + i * 6 + 1];
              g = (bytes[dataStart + i * 6 + 2] << 8) | bytes[dataStart + i * 6 + 3];
              b = (bytes[dataStart + i * 6 + 4] << 8) | bytes[dataStart + i * 6 + 5];
            }

            pixels[i * 4] = Math.round((r / maxValue) * 255);
            pixels[i * 4 + 1] = Math.round((g / maxValue) * 255);
            pixels[i * 4 + 2] = Math.round((b / maxValue) * 255);
            pixels[i * 4 + 3] = 255;
          }
        } else {
          for (let i = 0; i < totalPixels; i++) {
            const r = readNumber();
            const g = readNumber();
            const b = readNumber();

            if (r > maxValue || g > maxValue || b > maxValue) {
              throw new Error(`Wartość koloru przekracza maxValue (${maxValue})`);
            }

            pixels[i * 4] = Math.round((r / maxValue) * 255);
            pixels[i * 4 + 1] = Math.round((g / maxValue) * 255);
            pixels[i * 4 + 2] = Math.round((b / maxValue) * 255);
            pixels[i * 4 + 3] = 255;
          }
        }

        resolve({ width, height, maxValue, pixels, format });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Błąd odczytu pliku"));
    reader.readAsArrayBuffer(file);
  });
};
