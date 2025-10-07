import type { PPMImage } from "../types/types";

export const savePPM = (ppmImage: PPMImage) => {
  // Tworzymy plik PPM P6
  const header = `P6\n${ppmImage.width} ${ppmImage.height}\n255\n`;
  const headerBytes = new TextEncoder().encode(header);

  // Konwertujemy RGBA na RGB
  const rgbData = new Uint8Array(ppmImage.width * ppmImage.height * 3);
  for (let i = 0; i < ppmImage.width * ppmImage.height; i++) {
    rgbData[i * 3] = ppmImage.pixels[i * 4];
    rgbData[i * 3 + 1] = ppmImage.pixels[i * 4 + 1];
    rgbData[i * 3 + 2] = ppmImage.pixels[i * 4 + 2];
  }

  // Łączymy nagłówek i dane
  const fullData = new Uint8Array(headerBytes.length + rgbData.length);
  fullData.set(headerBytes);
  fullData.set(rgbData, headerBytes.length);

  const blob = new Blob([fullData], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "image.ppm";
  a.click();
  URL.revokeObjectURL(url);
};
