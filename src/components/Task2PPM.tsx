import { useRef, useState } from "react";
import type { PPMImage } from "../types/types";
import { Download, RotateCcw, Upload } from "lucide-react";
import { parsePPM } from "../utils/parsePPM";

const Task2PPM = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<PPMImage | null>(null);
  const [currentImage, setCurrentImage] = useState<PPMImage | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [jpegQuality, setJpegQuality] = useState(90);

  // Parametry przekształceń punktowych
  const [addValue, setAddValue] = useState(0);
  const [subtractValue, setSubtractValue] = useState(0);
  const [multiplyValue, setMultiplyValue] = useState(1);
  const [divideValue, setDivideValue] = useState(1);
  const [brightnessValue, setBrightnessValue] = useState(0);

  // Parametry filtrów
  const [filterSize, setFilterSize] = useState(3);
  const [customMask, setCustomMask] = useState("0,-1,0\n-1,5,-1\n0,-1,0");

  const displayImage = (image: PPMImage) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.createImageData(image.width, image.height);
    imageData.data.set(image.pixels);
    ctx.putImageData(imageData, 0, 0);
  };

  const handleLoadPPM = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const image = await parsePPM(file);
      setOriginalImage(image);
      setCurrentImage(image);
      displayImage(image);
      setError("");
    } catch (err) {
      setError((err as Error).message);
      setOriginalImage(null);
      setCurrentImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadJPEG = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);

        const image: PPMImage = {
          width: img.width,
          height: img.height,
          maxValue: 255,
          pixels: imageData.data,
          format: "P6",
        };

        setOriginalImage(image);
        setCurrentImage(image);
        setLoading(false);
      };
      img.onerror = () => {
        setError("Błąd wczytywania pliku JPEG");
        setLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveJPEG = () => {
    if (!currentImage) {
      alert("Najpierw wczytaj obraz");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "image.jpg";
        a.click();
        URL.revokeObjectURL(url);
      },
      "image/jpeg",
      jpegQuality / 100
    );
  };

  const resetToOriginal = () => {
    if (originalImage) {
      setCurrentImage({ ...originalImage, pixels: new Uint8ClampedArray(originalImage.pixels) });
      displayImage(originalImage);
    }
  };

  // Przekształcenia punktowe
  const applyPointTransform = (operation: string, value: number) => {
    if (!currentImage) return;

    const newPixels = new Uint8ClampedArray(currentImage.pixels);

    for (let i = 0; i < newPixels.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let pixel = newPixels[i + c];

        switch (operation) {
          case "add":
            pixel = Math.min(255, pixel + value);
            break;
          case "subtract":
            pixel = Math.max(0, pixel - value);
            break;
          case "multiply":
            pixel = Math.min(255, pixel * value);
            break;
          case "divide":
            pixel = value !== 0 ? Math.min(255, pixel / value) : 0;
            break;
          case "brightness":
            pixel = Math.min(255, Math.max(0, pixel + value));
            break;
        }

        newPixels[i + c] = pixel;
      }
    }

    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  const toGrayscaleAverage = () => {
    if (!currentImage) return;

    const newPixels = new Uint8ClampedArray(currentImage.pixels);

    for (let i = 0; i < newPixels.length; i += 4) {
      const avg = (newPixels[i] + newPixels[i + 1] + newPixels[i + 2]) / 3;
      newPixels[i] = avg;
      newPixels[i + 1] = avg;
      newPixels[i + 2] = avg;
    }

    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  const toGrayscaleWeighted = () => {
    if (!currentImage) return;

    const newPixels = new Uint8ClampedArray(currentImage.pixels);

    for (let i = 0; i < newPixels.length; i += 4) {
      const gray = 0.299 * newPixels[i] + 0.587 * newPixels[i + 1] + 0.114 * newPixels[i + 2];
      newPixels[i] = gray;
      newPixels[i + 1] = gray;
      newPixels[i + 2] = gray;
    }

    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  // Filtry
  const applyConvolution = (mask: number[][], divisor: number = 1, offset: number = 0) => {
    if (!currentImage) return;

    const { width, height, pixels } = currentImage;
    const newPixels = new Uint8ClampedArray(pixels);
    const maskSize = mask.length;
    const halfMask = Math.floor(maskSize / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;

          for (let my = 0; my < maskSize; my++) {
            for (let mx = 0; mx < maskSize; mx++) {
              const py = y + my - halfMask;
              const px = x + mx - halfMask;

              if (py >= 0 && py < height && px >= 0 && px < width) {
                const idx = (py * width + px) * 4 + c;
                sum += pixels[idx] * mask[my][mx];
              }
            }
          }

          const idx = (y * width + x) * 4 + c;
          newPixels[idx] = Math.min(255, Math.max(0, sum / divisor + offset));
        }
      }
    }

    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  const applyAverageFilter = () => {
    const size = filterSize;
    const mask = Array(size)
      .fill(0)
      .map(() => Array(size).fill(1));
    applyConvolution(mask, size * size);
  };

  const applyMedianFilter = () => {
    if (!currentImage) return;

    const { width, height, pixels } = currentImage;
    const newPixels = new Uint8ClampedArray(pixels);
    const size = filterSize;
    const halfSize = Math.floor(size / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < 3; c++) {
          const values: number[] = [];

          for (let my = -halfSize; my <= halfSize; my++) {
            for (let mx = -halfSize; mx <= halfSize; mx++) {
              const py = y + my;
              const px = x + mx;

              if (py >= 0 && py < height && px >= 0 && px < width) {
                const idx = (py * width + px) * 4 + c;
                values.push(pixels[idx]);
              }
            }
          }

          values.sort((a, b) => a - b);
          const idx = (y * width + x) * 4 + c;
          newPixels[idx] = values[Math.floor(values.length / 2)];
        }
      }
    }

    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  const applySobelFilter = () => {
    if (!currentImage) return;

    const { width, height, pixels } = currentImage;
    const newPixels = new Uint8ClampedArray(pixels);

    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];

    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let gx = 0,
            gy = 0;

          for (let my = 0; my < 3; my++) {
            for (let mx = 0; mx < 3; mx++) {
              const py = y + my - 1;
              const px = x + mx - 1;
              const idx = (py * width + px) * 4 + c;

              gx += pixels[idx] * sobelX[my][mx];
              gy += pixels[idx] * sobelY[my][mx];
            }
          }

          const magnitude = Math.sqrt(gx * gx + gy * gy);
          const idx = (y * width + x) * 4 + c;
          newPixels[idx] = Math.min(255, magnitude);
        }
      }
    }

    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  const applySharpenFilter = () => {
    const mask = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ];
    applyConvolution(mask);
  };

  const applyGaussianBlur = () => {
    const mask = [
      [1, 2, 1],
      [2, 4, 2],
      [1, 2, 1],
    ];
    applyConvolution(mask, 16);
  };

  const applyCustomMask = () => {
    try {
      const rows = customMask.trim().split("\n");
      const mask = rows.map((row) => row.split(",").map((val) => parseFloat(val.trim())));

      if (mask.some((row) => row.some((val) => isNaN(val)))) {
        alert("Nieprawidłowa maska - sprawdź format");
        return;
      }

      const size = mask.length;
      if (!mask.every((row) => row.length === size)) {
        alert("Maska musi być kwadratowa");
        return;
      }

      applyConvolution(mask);
    } catch {
      alert("Błąd parsowania maski");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          {/* Wczytywanie obrazu */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3 text-gray-700">Wczytaj obraz</h3>
            <div className="space-y-2">
              <label className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium">
                <Upload size={16} />
                Wczytaj PPM
                <input type="file" accept=".ppm" onChange={handleLoadPPM} className="hidden" />
              </label>
              <label className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium">
                <Upload size={16} />
                Wczytaj JPEG
                <input type="file" accept=".jpg,.jpeg" onChange={handleLoadJPEG} className="hidden" />
              </label>
              {currentImage && (
                <button
                  onClick={resetToOriginal}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <RotateCcw size={16} />
                  Resetuj
                </button>
              )}
            </div>
          </div>

          {currentImage && (
            <>
              {/* Informacje o obrazie */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700">Informacje</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Wymiary:</span> {currentImage.width} x {currentImage.height}
                  </p>
                  <p>
                    <span className="font-medium">Pikseli:</span> {currentImage.width * currentImage.height}
                  </p>
                </div>
              </div>

              {/* Przekształcenia punktowe */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700">Przekształcenia punktowe</h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Dodawanie</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={addValue}
                        onChange={(e) => setAddValue(Number(e.target.value))}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <button
                        onClick={() => applyPointTransform("add", addValue)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Odejmowanie</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={subtractValue}
                        onChange={(e) => setSubtractValue(Number(e.target.value))}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <button
                        onClick={() => applyPointTransform("subtract", subtractValue)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        -
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Mnożenie</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={multiplyValue}
                        onChange={(e) => setMultiplyValue(Number(e.target.value))}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <button
                        onClick={() => applyPointTransform("multiply", multiplyValue)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Dzielenie</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        value={divideValue}
                        onChange={(e) => setDivideValue(Number(e.target.value))}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <button
                        onClick={() => applyPointTransform("divide", divideValue)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        ÷
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Jasność</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={brightnessValue}
                        onChange={(e) => setBrightnessValue(Number(e.target.value))}
                        className="flex-1 px-2 py-1 border rounded text-sm"
                      />
                      <button
                        onClick={() => applyPointTransform("brightness", brightnessValue)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        ☀
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <button
                      onClick={toGrayscaleAverage}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm mb-2"
                    >
                      Skala szarości (średnia)
                    </button>
                    <button
                      onClick={toGrayscaleWeighted}
                      className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      Skala szarości (ważona)
                    </button>
                  </div>
                </div>
              </div>

              {/* Filtry */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700">Filtry</h3>

                <div className="space-y-2">
                  <div className="mb-3">
                    <label className="text-xs font-medium text-gray-600">
                      Rozmiar maski: {filterSize}x{filterSize}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="9"
                      step="2"
                      value={filterSize}
                      onChange={(e) => setFilterSize(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <button
                    onClick={applyAverageFilter}
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    Uśredniający
                  </button>
                  <button
                    onClick={applyMedianFilter}
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    Medianowy
                  </button>
                  <button
                    onClick={applySobelFilter}
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    Sobel (krawędzie)
                  </button>
                  <button
                    onClick={applySharpenFilter}
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    Wyostrzający
                  </button>
                  <button
                    onClick={applyGaussianBlur}
                    className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                  >
                    Gaussian Blur
                  </button>
                </div>
              </div>

              {/* Własna maska */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700">Własna maska</h3>
                <textarea
                  value={customMask}
                  onChange={(e) => setCustomMask(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm font-mono"
                  rows={3}
                  placeholder="0,-1,0&#10;-1,5,-1&#10;0,-1,0"
                />
                <p className="text-xs text-gray-600 mb-2">Oddziel wartości przecinkiem, wiersze enterem</p>
                <button
                  onClick={applyCustomMask}
                  className="w-full px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                >
                  Zastosuj maskę
                </button>
              </div>

              {/* Zapisywanie */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700">Jakość JPEG: {jpegQuality}%</h3>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={jpegQuality}
                  onChange={(e) => setJpegQuality(parseInt(e.target.value))}
                  className="w-full mb-3"
                />
                <button
                  onClick={handleSaveJPEG}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Download size={16} />
                  Zapisz jako JPEG
                </button>
              </div>
            </>
          )}
        </div>

        {/* Podgląd obrazu */}
        <div className="lg:col-span-3">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700 mb-4">Podgląd obrazu</h3>

            {loading && <div className="flex items-center justify-center h-96 text-gray-500">Wczytywanie...</div>}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Błąd:</strong> {error}
              </div>
            )}

            {!loading && !currentImage && !error && (
              <div className="flex items-center justify-center h-96 text-gray-500">
                Wczytaj obraz PPM lub JPEG, aby rozpocząć
              </div>
            )}

            <div className="overflow-auto max-h-[800px] border-2 border-gray-300 rounded">
              <canvas ref={canvasRef} className="bg-gray-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Task2PPM;
