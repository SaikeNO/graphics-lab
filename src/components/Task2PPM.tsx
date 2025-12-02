import { useRef, useState } from "react";
import { Download, RotateCcw, Upload, Binary, Layers } from "lucide-react";
import type { PPMImage } from "../types/types";
import { parsePPM } from "../utils/parsePPM";

const Task2PPM = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<PPMImage | null>(null);
  const [currentImage, setCurrentImage] = useState<PPMImage | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [jpegQuality, setJpegQuality] = useState(90);

  // Parametry przekształceń punktowych
  const [addColor, setAddColor] = useState({ r: 0, g: 0, b: 0 });
  const [subtractColor, setSubtractColor] = useState({ r: 0, g: 0, b: 0 });
  const [multiplyColor, setMultiplyColor] = useState({ r: 1, g: 1, b: 1 });
  const [divideColor, setDivideColor] = useState({ r: 1, g: 1, b: 1 });
  const [brightnessValue, setBrightnessValue] = useState(0);
  const [binThreshold, setBinThreshold] = useState(128);

  // Parametry filtrów splotowych
  const [filterSize, setFilterSize] = useState(3);
  const [customMask, setCustomMask] = useState("0,-1,0\n-1,5,-1\n0,-1,0");

  // Parametry morfologiczne
  const [morphKernelStr, setMorphKernelStr] = useState("0,1,0\n1,1,1\n0,1,0");

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

  const applyPointTransform = (operation: string, value: number, rgbValues: { r: number; g: number; b: number }) => {
    if (!currentImage) return;

    const newPixels = new Uint8ClampedArray(currentImage.pixels);

    for (let i = 0; i < newPixels.length; i += 4) {
      const colorValues = [rgbValues.r, rgbValues.g, rgbValues.b];
      for (let c = 0; c < 3; c++) {
        let pixel = newPixels[i + c];
        const colorValue = colorValues[c];

        switch (operation) {
          case "add":
            pixel = Math.min(255, pixel + colorValue);
            break;
          case "subtract":
            pixel = Math.max(0, pixel - colorValue);
            break;
          case "multiply":
            pixel = Math.min(255, pixel * colorValue);
            break;
          case "divide":
            pixel = colorValue !== 0 ? Math.min(255, pixel / colorValue) : 0;
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
      newPixels[i] = newPixels[i + 1] = newPixels[i + 2] = avg;
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
      newPixels[i] = newPixels[i + 1] = newPixels[i + 2] = gray;
    }
    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  const binarizeImage = () => {
    if (!currentImage) return;
    const newPixels = new Uint8ClampedArray(currentImage.pixels);

    for (let i = 0; i < newPixels.length; i += 4) {
      const gray = (newPixels[i] + newPixels[i + 1] + newPixels[i + 2]) / 3;
      const val = gray > binThreshold ? 255 : 0;
      newPixels[i] = newPixels[i + 1] = newPixels[i + 2] = val;
    }

    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

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
              const idx = ((y + my - 1) * width + (x + mx - 1)) * 4 + c;
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

  const parseMorphKernel = () => {
    try {
      const rows = morphKernelStr.trim().split("\n");
      const kernel = rows.map((row) => row.split(",").map((val) => parseInt(val.trim())));

      const width = kernel[0].length;

      if (!kernel.every((row) => row.length === width)) {
        throw new Error("Element strukturalny musi być prostokątny");
      }

      if (kernel.some((row) => row.some((val) => ![0, 1, -1].includes(val)))) {
        alert("Ostrzeżenie: Wartości w jądrze powinny być 0, 1 lub -1.");
      }

      return kernel;
    } catch {
      alert("Błąd parsowania elementu strukturalnego.");
      return null;
    }
  };

  const performMorphOperation = (
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    kernel: number[][],
    type: "erosion" | "dilation"
  ) => {
    const newPixels = new Uint8ClampedArray(pixels);
    const kh = kernel.length;
    const kw = kernel[0].length;
    const cy = Math.floor(kh / 2);
    const cx = Math.floor(kw / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        for (let c = 0; c < 3; c++) {
          let extremeVal = type === "dilation" ? 0 : 255;
          let hit = false;

          for (let ky = 0; ky < kh; ky++) {
            for (let kx = 0; kx < kw; kx++) {
              if (kernel[ky][kx] === 1) {
                const py = y + ky - cy;
                const px = x + kx - cx;

                if (py >= 0 && py < height && px >= 0 && px < width) {
                  const idx = (py * width + px) * 4 + c;
                  const val = pixels[idx];
                  if (type === "dilation") {
                    if (val > extremeVal) extremeVal = val;
                  } else {
                    if (val < extremeVal) extremeVal = val;
                  }
                  hit = true;
                }
              }
            }
          }
          const idx = (y * width + x) * 4 + c;
          newPixels[idx] = hit ? extremeVal : pixels[idx];
        }
      }
    }
    return newPixels;
  };

  const applyMorphology = (type: "dilation" | "erosion" | "opening" | "closing") => {
    if (!currentImage) return;
    const kernel = parseMorphKernel();
    if (!kernel) return;

    let pixels = currentImage.pixels;

    if (type === "dilation") {
      pixels = performMorphOperation(pixels, currentImage.width, currentImage.height, kernel, "dilation");
    } else if (type === "erosion") {
      pixels = performMorphOperation(pixels, currentImage.width, currentImage.height, kernel, "erosion");
    } else if (type === "opening") {
      pixels = performMorphOperation(pixels, currentImage.width, currentImage.height, kernel, "erosion");
      pixels = performMorphOperation(pixels, currentImage.width, currentImage.height, kernel, "dilation");
    } else if (type === "closing") {
      pixels = performMorphOperation(pixels, currentImage.width, currentImage.height, kernel, "dilation");
      pixels = performMorphOperation(pixels, currentImage.width, currentImage.height, kernel, "erosion");
    }

    const newImage = { ...currentImage, pixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  const performHitOrMiss = (pixels: Uint8ClampedArray, width: number, height: number, kernel: number[][]) => {
    const newPixels = new Uint8ClampedArray(pixels.length).fill(0);
    for (let i = 3; i < pixels.length; i += 4) newPixels[i] = 255;

    const kh = kernel.length;
    const kw = kernel[0].length;
    const cy = Math.floor(kh / 2);
    const cx = Math.floor(kw / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let match = true;

        for (let ky = 0; ky < kh; ky++) {
          for (let kx = 0; kx < kw; kx++) {
            const kVal = kernel[ky][kx];
            if (kVal === -1) continue;

            const py = y + ky - cy;
            const px = x + kx - cx;

            let pixelVal = 0;
            if (py >= 0 && py < height && px >= 0 && px < width) {
              const idx = (py * width + px) * 4;
              pixelVal = pixels[idx] > 128 ? 255 : 0;
            }

            if (kVal === 1 && pixelVal !== 255) {
              match = false;
              break;
            }
            if (kVal === 0 && pixelVal !== 0) {
              match = false;
              break;
            }
          }
          if (!match) break;
        }

        if (match) {
          const idx = (y * width + x) * 4;
          newPixels[idx] = 255;
          newPixels[idx + 1] = 255;
          newPixels[idx + 2] = 255;
        }
      }
    }
    return newPixels;
  };

  const applyHitOrMissOperation = (mode: "basic" | "thinning" | "thickening") => {
    if (!currentImage) return;
    const kernel = parseMorphKernel();
    if (!kernel) return;

    const hitPixels = performHitOrMiss(currentImage.pixels, currentImage.width, currentImage.height, kernel);
    let finalPixels;

    if (mode === "basic") {
      finalPixels = hitPixels;
    } else {
      finalPixels = new Uint8ClampedArray(currentImage.pixels);
      for (let i = 0; i < finalPixels.length; i += 4) {
        const originalVal = currentImage.pixels[i];
        const hitVal = hitPixels[i];

        let newVal = originalVal;
        if (mode === "thinning") {
          if (hitVal === 255) newVal = 0;
        } else if (mode === "thickening") {
          if (hitVal === 255) newVal = 255;
        }

        finalPixels[i] = finalPixels[i + 1] = finalPixels[i + 2] = newVal;
      }
    }

    const newImage = { ...currentImage, pixels: finalPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  return (
    <div className="max-w-7xl mx-auto pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
              <Upload size={18} /> Wczytywanie
            </h3>
            <div className="space-y-2">
              <label className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium">
                PPM
                <input type="file" accept=".ppm" onChange={handleLoadPPM} className="hidden" />
              </label>
              <label className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium">
                JPEG
                <input type="file" accept=".jpg,.jpeg" onChange={handleLoadJPEG} className="hidden" />
              </label>
              {currentImage && (
                <button
                  onClick={resetToOriginal}
                  className="w-full px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <RotateCcw size={16} /> Resetuj
                </button>
              )}
            </div>
          </div>

          {currentImage && (
            <>
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
                <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                  <Layers size={18} /> Morfologia
                </h3>

                <div className="mb-4 ">
                  <label className="text-xs font-bold text-gray-600 flex items-center gap-2 mb-2">
                    <Binary size={14} /> 1. Binaryzacja (Zalecane)
                  </label>

                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={binThreshold}
                    onChange={(e) => setBinThreshold(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mb-2">
                    <span>Próg: {binThreshold}</span>
                  </div>
                  <button
                    onClick={binarizeImage}
                    className="w-full px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                  >
                    Binaryzuj Obraz
                  </button>
                </div>

                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-600">Element strukturalny (Kernel)</label>
                  <p className="text-[10px] text-gray-400 mb-1">0=Tło, 1=Obiekt, -1=Dowolny (dla H-o-M)</p>
                  <textarea
                    value={morphKernelStr}
                    onChange={(e) => setMorphKernelStr(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm font-mono"
                    rows={3}
                    placeholder="0,1,0&#10;1,1,1&#10;0,1,0"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => applyMorphology("dilation")}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-medium"
                  >
                    Dylatacja
                  </button>
                  <button
                    onClick={() => applyMorphology("erosion")}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-medium"
                  >
                    Erozja
                  </button>
                  <button
                    onClick={() => applyMorphology("opening")}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-medium"
                  >
                    Otwarcie
                  </button>
                  <button
                    onClick={() => applyMorphology("closing")}
                    className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-medium"
                  >
                    Domknięcie
                  </button>
                </div>

                <div className="border-t pt-2 space-y-2">
                  <button
                    onClick={() => applyHitOrMissOperation("basic")}
                    className="w-full px-2 py-1 bg-pink-100 text-pink-700 rounded hover:bg-pink-200 text-xs font-medium"
                  >
                    Hit-or-Miss (Szukanie wzorca)
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => applyHitOrMissOperation("thinning")}
                      className="px-2 py-1 bg-pink-100 text-pink-700 rounded hover:bg-pink-200 text-xs font-medium"
                    >
                      Pocienianie
                    </button>
                    <button
                      onClick={() => applyHitOrMissOperation("thickening")}
                      className="px-2 py-1 bg-pink-100 text-pink-700 rounded hover:bg-pink-200 text-xs font-medium"
                    >
                      Pogrubianie
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700 text-sm">Przekształcenia i Kolory</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Dodawanie</label>
                    <div className="flex gap-2 mb-1">
                      <div className="flex-1 flex gap-1">
                        <input
                          type="number"
                          value={addColor.r}
                          onChange={(e) => setAddColor((prev) => ({ ...prev, r: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="R"
                        />
                        <input
                          type="number"
                          value={addColor.g}
                          onChange={(e) => setAddColor((prev) => ({ ...prev, g: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="G"
                        />
                        <input
                          type="number"
                          value={addColor.b}
                          onChange={(e) => setAddColor((prev) => ({ ...prev, b: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="B"
                        />
                      </div>
                      <button
                        onClick={() => applyPointTransform("add", 0, addColor)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Odejmowanie</label>
                    <div className="flex gap-2 mb-1">
                      <div className="flex-1 flex gap-1">
                        <input
                          type="number"
                          value={subtractColor.r}
                          onChange={(e) => setSubtractColor((prev) => ({ ...prev, r: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="R"
                        />
                        <input
                          type="number"
                          value={subtractColor.g}
                          onChange={(e) => setSubtractColor((prev) => ({ ...prev, g: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="G"
                        />
                        <input
                          type="number"
                          value={subtractColor.b}
                          onChange={(e) => setSubtractColor((prev) => ({ ...prev, b: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="B"
                        />
                      </div>
                      <button
                        onClick={() => applyPointTransform("subtract", 0, subtractColor)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                      >
                        -
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Mnożenie</label>
                    <div className="flex gap-2 mb-1">
                      <div className="flex-1 flex gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={multiplyColor.r}
                          onChange={(e) => setMultiplyColor((prev) => ({ ...prev, r: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="R"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={multiplyColor.g}
                          onChange={(e) => setMultiplyColor((prev) => ({ ...prev, g: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="G"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={multiplyColor.b}
                          onChange={(e) => setMultiplyColor((prev) => ({ ...prev, b: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="B"
                        />
                      </div>
                      <button
                        onClick={() => applyPointTransform("multiply", 0, multiplyColor)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                      >
                        x
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Dzielenie</label>
                    <div className="flex gap-2 mb-1">
                      <div className="flex-1 flex gap-1">
                        <input
                          type="number"
                          step="0.1"
                          value={divideColor.r}
                          onChange={(e) => setDivideColor((prev) => ({ ...prev, r: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="R"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={divideColor.g}
                          onChange={(e) => setDivideColor((prev) => ({ ...prev, g: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="G"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={divideColor.b}
                          onChange={(e) => setDivideColor((prev) => ({ ...prev, b: Number(e.target.value) }))}
                          className="w-full px-2 py-1 border rounded text-xs"
                          placeholder="B"
                        />
                      </div>
                      <button
                        onClick={() => applyPointTransform("divide", 0, divideColor)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
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
                        className="flex-1 px-2 py-1 border rounded text-xs"
                      />
                      <button
                        onClick={() =>
                          applyPointTransform("brightness", brightnessValue, {
                            r: brightnessValue,
                            g: brightnessValue,
                            b: brightnessValue,
                          })
                        }
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
                      >
                        ☀
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      onClick={toGrayscaleAverage}
                      className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                    >
                      Szarość (Średnia)
                    </button>
                    <button
                      onClick={toGrayscaleWeighted}
                      className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs"
                    >
                      Szarość (Ważona)
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700 text-sm">Filtry Splotowe</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-600">
                      Rozmiar: {filterSize}x{filterSize}
                    </label>
                    <input
                      type="range"
                      min="3"
                      max="9"
                      step="2"
                      value={filterSize}
                      onChange={(e) => setFilterSize(Number(e.target.value))}
                      className="w-24"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={applyAverageFilter}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                    >
                      Uśredniający
                    </button>
                    <button
                      onClick={applyMedianFilter}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                    >
                      Medianowy
                    </button>
                    <button
                      onClick={applySobelFilter}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                    >
                      Sobel
                    </button>
                    <button
                      onClick={applySharpenFilter}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                    >
                      Wyostrzający
                    </button>
                    <button
                      onClick={applyGaussianBlur}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                    >
                      Gaussian Blur
                    </button>
                  </div>
                  <div className="mt-2 border-t pt-2">
                    <textarea
                      value={customMask}
                      onChange={(e) => setCustomMask(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-xs font-mono mb-1"
                      rows={2}
                    />
                    <button
                      onClick={applyCustomMask}
                      className="w-full px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs"
                    >
                      Własna maska
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700 text-sm">Eksport</h3>
                <div className="space-y-2">
                  <label className="text-xs text-gray-600">Jakość JPEG: {jpegQuality}%</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={jpegQuality}
                    onChange={(e) => setJpegQuality(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <button
                    onClick={handleSaveJPEG}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <Download size={16} /> Zapisz JPEG
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white p-4 rounded-lg shadow h-full">
            <h3 className="font-semibold text-gray-700 mb-4">Podgląd obrazu</h3>

            {loading && <div className="flex items-center justify-center h-96 text-gray-500">Wczytywanie...</div>}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Błąd:</strong> {error}
              </div>
            )}

            {!loading && !currentImage && !error && (
              <div className="flex flex-col items-center justify-center h-96 text-gray-400 border-2 border-dashed rounded-lg">
                <Upload size={48} className="mb-2 opacity-50" />
                <p>Wczytaj obraz PPM lub JPEG, aby rozpocząć</p>
              </div>
            )}

            <div className="overflow-auto max-h-[800px] border border-gray-200 rounded bg-gray-50 flex items-start justify-center">
              <canvas ref={canvasRef} className="max-w-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Task2PPM;
