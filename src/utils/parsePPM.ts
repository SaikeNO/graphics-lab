import type { PPMImage } from "../types/types";

export const parsePPM = async (file: File): Promise<PPMImage> => {
  const arrayBuffer = await file.arrayBuffer();
  const dataView = new DataView(arrayBuffer);
  let offset = 0;

  // ASCII character codes
  const CHAR_SPACE = " ".charCodeAt(0);
  const CHAR_TAB = "\t".charCodeAt(0);
  const CHAR_NEWLINE = "\n".charCodeAt(0);
  const CHAR_CARRIAGE_RETURN = "\r".charCodeAt(0);
  const CHAR_HASH = "#".charCodeAt(0);

  const readByte = (): number => {
    if (offset >= arrayBuffer.byteLength) {
      throw new Error("Nieoczekiwany koniec pliku");
    }
    return dataView.getUint8(offset++);
  };

  const isWhitespace = (byte: number): boolean => {
    return (
      byte === CHAR_SPACE ||
      byte === CHAR_TAB ||
      byte === CHAR_NEWLINE ||
      byte === CHAR_CARRIAGE_RETURN
    );
  };

  const skipWhitespaceAndComments = (): void => {
    while (offset < arrayBuffer.byteLength) {
      const byte = dataView.getUint8(offset);

      if (isWhitespace(byte)) {
        offset++;
        continue;
      }

      // Skip comments (from # to end of line)
      if (byte === CHAR_HASH) {
        offset++;
        while (offset < arrayBuffer.byteLength) {
          const commentByte = dataView.getUint8(offset++);
          if (
            commentByte === CHAR_NEWLINE ||
            commentByte === CHAR_CARRIAGE_RETURN
          ) {
            break;
          }
        }
        continue;
      }

      break;
    }
  };

  const readToken = (): string => {
    skipWhitespaceAndComments();
    let token = "";

    while (offset < arrayBuffer.byteLength) {
      const byte = dataView.getUint8(offset);

      // Stop at whitespace or comment
      if (isWhitespace(byte) || byte === CHAR_HASH) {
        break;
      }

      token += String.fromCharCode(byte);
      offset++;
    }

    if (token === "") {
      throw new Error("Oczekiwano tokenu, ale nie znaleziono");
    }

    return token;
  };

  const format = readToken();
  if (format !== "P3" && format !== "P6") {
    throw new Error(
      `Nieprawidłowy format PPM: oczekiwano P3 lub P6, otrzymano ${format}`
    );
  }

  const widthStr = readToken();
  const width = parseInt(widthStr, 10);
  if (isNaN(width) || width <= 0) {
    throw new Error(`Nieprawidłowa szerokość: ${widthStr}`);
  }

  const heightStr = readToken();
  const height = parseInt(heightStr, 10);
  if (isNaN(height) || height <= 0) {
    throw new Error(`Nieprawidłowa wysokość: ${heightStr}`);
  }

  const maxValueStr = readToken();
  const maxValue = parseInt(maxValueStr, 10);
  if (isNaN(maxValue) || maxValue <= 0 || maxValue >= 65536) {
    throw new Error(
      `Nieprawidłowa maksymalna wartość koloru: ${maxValueStr} (musi być 1-65535)`
    );
  }

  skipWhitespaceAndComments();

  const pixelCount = width * height;
  const bytesPerComponent = maxValue < 256 ? 1 : 2;
  const expectedBytes = pixelCount * 3 * bytesPerComponent;

  const pixels = new Uint8ClampedArray(pixelCount * 4); // format rgba

  if (format === "P6") {
    const remainingBytes = arrayBuffer.byteLength - offset;
    if (remainingBytes < expectedBytes) {
      throw new Error(
        `Niewystarczające dane pikseli: oczekiwano ${expectedBytes} bajtów, otrzymano ${remainingBytes}`
      );
    }

    if (bytesPerComponent === 1) {
      // 1 byte per component (max value < 256)
      for (let i = 0; i < pixelCount; i++) {
        const r = readByte();
        const g = readByte();
        const b = readByte();

        const idx = i * 4;
        // Normalize to 0-255 range
        pixels[idx] = Math.round((r / maxValue) * 255); // R
        pixels[idx + 1] = Math.round((g / maxValue) * 255); // G
        pixels[idx + 2] = Math.round((b / maxValue) * 255); // B
        pixels[idx + 3] = 255; // A (full opacity)
      }
    } else {
      // 2 bytes per component (max value >= 256)
      for (let i = 0; i < pixelCount; i++) {
        const rHigh = readByte();
        const rLow = readByte();
        const r = (rHigh << 8) | rLow;

        const gHigh = readByte();
        const gLow = readByte();
        const g = (gHigh << 8) | gLow;

        const bHigh = readByte();
        const bLow = readByte();
        const b = (bHigh << 8) | bLow;

        const idx = i * 4;
        // Normalize to 0-255 range
        pixels[idx] = Math.round((r / maxValue) * 255); // R
        pixels[idx + 1] = Math.round((g / maxValue) * 255); // G
        pixels[idx + 2] = Math.round((b / maxValue) * 255); // B
        pixels[idx + 3] = 255; // A (full opacity)
      }
    }
  } else {
    // P3 - ASCII format
    for (let i = 0; i < pixelCount; i++) {
      const rStr = readToken();
      const gStr = readToken();
      const bStr = readToken();

      const r = parseInt(rStr, 10);
      const g = parseInt(gStr, 10);
      const b = parseInt(bStr, 10);

      if (isNaN(r) || r < 0 || r > maxValue) {
        throw new Error(
          `Nieprawidłowa wartość R: ${rStr} (musi być 0-${maxValue})`
        );
      }
      if (isNaN(g) || g < 0 || g > maxValue) {
        throw new Error(
          `Nieprawidłowa wartość G: ${gStr} (musi być 0-${maxValue})`
        );
      }
      if (isNaN(b) || b < 0 || b > maxValue) {
        throw new Error(
          `Nieprawidłowa wartość B: ${bStr} (musi być 0-${maxValue})`
        );
      }

      const idx = i * 4;
      // Normalize to 0-255 range
      pixels[idx] = Math.round((r / maxValue) * 255); // R
      pixels[idx + 1] = Math.round((g / maxValue) * 255); // G
      pixels[idx + 2] = Math.round((b / maxValue) * 255); // B
      pixels[idx + 3] = 255; // A (full opacity)
    }
  }

  return {
    width,
    height,
    maxValue,
    pixels,
    format,
  };
};
