import { useRef, useState, useEffect } from "react";
import {
  Download,
  RotateCcw,
  Upload,
  Binary,
  Layers,
  BarChart,
  Maximize,
  RefreshCcw,
  Sun,
  ArrowRightLeft,
} from "lucide-react";
import type { PPMImage } from "../types/types";
import { parsePPM } from "../utils/parsePPM";

const Task2Combined = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const histogramRef = useRef<HTMLCanvasElement>(null);

  // --- Stan Obrazu ---
  const [originalImage, setOriginalImage] = useState<PPMImage | null>(null);
  const [currentImage, setCurrentImage] = useState<PPMImage | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // PRZYWRÓCONE: Stan jakości JPEG
  const [jpegQuality, setJpegQuality] = useState(90);

  // --- Stan Histogramu ---
  const [histogram, setHistogram] = useState<number[]>(new Array(256).fill(0));
  const [autoThreshold, setAutoThreshold] = useState<number | null>(null);

  // --- Parametry Przekształceń Punktowych ---
  const [addColor, setAddColor] = useState({ r: 0, g: 0, b: 0 });
  const [subtractColor, setSubtractColor] = useState({ r: 0, g: 0, b: 0 });
  const [multiplyColor, setMultiplyColor] = useState({ r: 1, g: 1, b: 1 });
  const [divideColor, setDivideColor] = useState({ r: 1, g: 1, b: 1 });
  const [brightnessValue, setBrightnessValue] = useState(0);

  // --- Parametry Binaryzacji ---
  const [binThreshold, setBinThreshold] = useState(128);
  const [percentBlack, setPercentBlack] = useState(50);

  // --- Parametry Filtrów ---
  const [filterSize, setFilterSize] = useState(3);
  const [customMask, setCustomMask] = useState("0,-1,0\n-1,5,-1\n0,-1,0");

  // --- Parametry Morfologiczne ---
  const [morphKernelStr, setMorphKernelStr] = useState("0,1,0\n1,1,1\n0,1,0");

  // ==========================================
  // LOGIKA HISTOGRAMU
  // ==========================================

  const calculateHistogram = (image: PPMImage): number[] => {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < image.pixels.length; i += 4) {
      const gray = Math.round(0.299 * image.pixels[i] + 0.587 * image.pixels[i + 1] + 0.114 * image.pixels[i + 2]);
      hist[gray]++;
    }
    return hist;
  };

  const drawHistogram = (hist: number[]) => {
    const canvas = histogramRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1000;
    canvas.height = 300;

    const marginBottom = 30;
    const marginLeft = 40;
    const plotHeight = canvas.height - marginBottom;
    const plotWidth = canvas.width - marginLeft;

    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const maxVal = Math.max(...hist);
    const barWidth = plotWidth / 256;

    ctx.fillStyle = "#3b82f6";
    for (let i = 0; i < 256; i++) {
      const barHeight = (hist[i] / maxVal) * (plotHeight - 10);
      ctx.fillRect(marginLeft + i * barWidth, plotHeight - barHeight, barWidth, barHeight);
    }

    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginLeft, 0);
    ctx.lineTo(marginLeft, plotHeight);
    ctx.lineTo(canvas.width, plotHeight);
    ctx.stroke();

    ctx.fillStyle = "#374151";
    ctx.font = "14px sans-serif";
    ctx.textAlign = "center";
    const xLabels = [0, 64, 128, 192, 255];
    xLabels.forEach((val) => {
      const x = marginLeft + (val / 255) * plotWidth;
      ctx.fillText(val.toString(), x, plotHeight + 20);
    });

    if (autoThreshold !== null || binThreshold !== null) {
      const valToShow = autoThreshold !== null ? autoThreshold : binThreshold;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const thresholdX = marginLeft + valToShow * barWidth;
      ctx.moveTo(thresholdX, 0);
      ctx.lineTo(thresholdX, plotHeight);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Próg: ${valToShow}`, thresholdX + 5, 20);
    }
  };

  useEffect(() => {
    if (currentImage) {
      const hist = calculateHistogram(currentImage);
      setHistogram(hist);
    }
  }, [currentImage]);

  useEffect(() => {
    if (histogram && histogramRef.current) {
      drawHistogram(histogram);
    }
  }, [histogram, autoThreshold, binThreshold]);

  // ==========================================
  // PODSTAWOWE OPERACJE
  // ==========================================

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
      setAutoThreshold(null);
    } catch (err) {
      setError((err as Error).message);
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
        const canvas = document.createElement("canvas");
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
        displayImage(image);
        setAutoThreshold(null);
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
      setAutoThreshold(null);
      setBinThreshold(128);
    }
  };

  // ==========================================
  // NORMALIZACJA
  // ==========================================

  const stretchHistogram = () => {
    if (!currentImage) return;
    const newPixels = new Uint8ClampedArray(currentImage.pixels);
    let min = 255,
      max = 0;
    for (let i = 0; i < newPixels.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        const val = newPixels[i + c];
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
    const range = max - min;
    if (range === 0) return;

    for (let i = 0; i < newPixels.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        newPixels[i + c] = Math.round(((newPixels[i + c] - min) / range) * 255);
      }
    }
    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  const equalizeHistogram = () => {
    if (!currentImage) return;
    const hist = calculateHistogram(currentImage);
    const totalPixels = currentImage.width * currentImage.height;

    const cdf = new Array(256).fill(0);
    cdf[0] = hist[0];
    for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];

    let cdfMin = 0;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] !== 0) {
        cdfMin = cdf[i];
        break;
      }
    }

    const mapping = new Array(256);
    for (let i = 0; i < 256; i++) {
      mapping[i] = Math.round(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
    }

    const newPixels = new Uint8ClampedArray(currentImage.pixels);
    for (let i = 0; i < newPixels.length; i += 4) {
      const gray = Math.round(0.299 * newPixels[i] + 0.587 * newPixels[i + 1] + 0.114 * newPixels[i + 2]);
      const newGray = mapping[gray];
      newPixels[i] = newPixels[i + 1] = newPixels[i + 2] = newGray;
    }

    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  // ==========================================
  // BINARYZACJA
  // ==========================================

  const binarizeManual = (threshold: number) => {
    if (!currentImage) return;
    const newPixels = new Uint8ClampedArray(currentImage.pixels);
    for (let i = 0; i < newPixels.length; i += 4) {
      const gray = Math.round(0.299 * newPixels[i] + 0.587 * newPixels[i + 1] + 0.114 * newPixels[i + 2]);
      const val = gray >= threshold ? 255 : 0;
      newPixels[i] = newPixels[i + 1] = newPixels[i + 2] = val;
    }
    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
    setAutoThreshold(threshold);
  };

  const binarizePercentBlack = (percent: number) => {
    if (!currentImage) return;
    const hist = calculateHistogram(currentImage);
    const totalPixels = currentImage.width * currentImage.height;
    const targetBlackPixels = (percent / 100) * totalPixels;
    let sum = 0;
    let threshold = 0;
    for (let i = 0; i < 256; i++) {
      sum += hist[i];
      if (sum >= targetBlackPixels) {
        threshold = i;
        break;
      }
    }
    setBinThreshold(threshold);
    binarizeManual(threshold);
  };

  const binarizeMeanIterative = () => {
    if (!currentImage) return;
    const hist = calculateHistogram(currentImage);
    let sum = 0,
      count = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * hist[i];
      count += hist[i];
    }
    let threshold = Math.round(sum / count);
    let prevThreshold = -1;
    let iterations = 0;

    while (Math.abs(threshold - prevThreshold) > 1 && iterations < 100) {
      prevThreshold = threshold;
      let sum1 = 0,
        count1 = 0;
      for (let i = 0; i < threshold; i++) {
        sum1 += i * hist[i];
        count1 += hist[i];
      }
      const mean1 = count1 > 0 ? sum1 / count1 : 0;

      let sum2 = 0,
        count2 = 0;
      for (let i = threshold; i < 256; i++) {
        sum2 += i * hist[i];
        count2 += hist[i];
      }
      const mean2 = count2 > 0 ? sum2 / count2 : 255;
      threshold = Math.round((mean1 + mean2) / 2);
      iterations++;
    }
    setBinThreshold(threshold);
    binarizeManual(threshold);
  };

  const binarizeEntropy = () => {
    if (!currentImage) return;
    const hist = calculateHistogram(currentImage);
    const totalPixels = currentImage.width * currentImage.height;
    let maxEntropy = -Infinity;
    let bestThreshold = 128;

    for (let t = 1; t < 255; t++) {
      let p1 = 0,
        p2 = 0;
      for (let i = 0; i < t; i++) p1 += hist[i];
      for (let i = t; i < 256; i++) p2 += hist[i];
      if (p1 === 0 || p2 === 0) continue;
      p1 /= totalPixels;
      p2 /= totalPixels;

      let h1 = 0,
        h2 = 0;
      for (let i = 0; i < t; i++) {
        if (hist[i] > 0) {
          const p = hist[i] / (p1 * totalPixels);
          h1 -= p * Math.log2(p);
        }
      }
      for (let i = t; i < 256; i++) {
        if (hist[i] > 0) {
          const p = hist[i] / (p2 * totalPixels);
          h2 -= p * Math.log2(p);
        }
      }
      const totalEntropy = h1 + h2;
      if (totalEntropy > maxEntropy) {
        maxEntropy = totalEntropy;
        bestThreshold = t;
      }
    }
    setBinThreshold(bestThreshold);
    binarizeManual(bestThreshold);
  };

  // ==========================================
  // PRZEKSZTAŁCENIA PUNKTOWE
  // ==========================================

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

  // ==========================================
  // FILTRY I MORFOLOGIA
  // ==========================================

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

  const applySharpenFilter = () =>
    applyConvolution([
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ]);

  // PRZYWRÓCONE: Gaussian Blur Function
  const applyGaussianBlur = () =>
    applyConvolution(
      [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1],
      ],
      16
    );

  const applyCustomMask = () => {
    try {
      const rows = customMask.trim().split("\n");
      const mask = rows.map((row) => row.split(",").map((val) => parseFloat(val.trim())));
      if (mask.some((row) => row.some((val) => isNaN(val)))) return alert("Nieprawidłowa maska");
      applyConvolution(mask);
    } catch {
      alert("Błąd parsowania maski");
    }
  };

  const parseMorphKernel = () => {
    try {
      const rows = morphKernelStr.trim().split("\n");
      const kernel = rows.map((row) => row.split(",").map((val) => parseInt(val.trim())));
      return kernel;
    } catch {
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
    if (type === "dilation")
      pixels = performMorphOperation(pixels, currentImage.width, currentImage.height, kernel, "dilation");
    else if (type === "erosion")
      pixels = performMorphOperation(pixels, currentImage.width, currentImage.height, kernel, "erosion");
    else if (type === "opening") {
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

  return (
    <div className="mx-auto pb-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* LEWA KOLUMNA - PANEL STEROWANIA */}
        <div className="lg:col-span-1 space-y-4">
          {/* 1. Wczytywanie */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
              <Upload size={18} /> Wczytywanie
            </h3>
            <div className="space-y-2">
              <label className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium">
                PPM <input type="file" accept=".ppm" onChange={handleLoadPPM} className="hidden" />
              </label>
              <label className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium">
                JPEG <input type="file" accept=".jpg,.jpeg" onChange={handleLoadJPEG} className="hidden" />
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
              {/* 2. Histogram i Normalizacja */}
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
                <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                  <BarChart size={18} /> Histogram i Normalizacja
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={stretchHistogram}
                    className="w-full px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <Maximize size={12} /> Rozszerzenie histogramu
                  </button>
                  <button
                    onClick={equalizeHistogram}
                    className="w-full px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <RefreshCcw size={12} /> Wyrównanie histogramu
                  </button>
                </div>
              </div>

              {/* 3. Binaryzacja */}
              <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
                <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                  <Binary size={18} /> Binaryzacja
                </h3>

                <div className="mb-3">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Ręczna (Próg: {binThreshold})</label>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={binThreshold}
                    onChange={(e) => setBinThreshold(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                  />
                  <button
                    onClick={() => binarizeManual(binThreshold)}
                    className="w-full px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                  >
                    Binaryzuj
                  </button>
                </div>

                <div className="mb-3 pt-2 border-t border-gray-100">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Procent czerni ({percentBlack}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={percentBlack}
                    onChange={(e) => setPercentBlack(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                  />
                  <button
                    onClick={() => binarizePercentBlack(percentBlack)}
                    className="w-full px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600"
                  >
                    Selekcja Procentowa
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={binarizeMeanIterative}
                    className="px-1 py-1 bg-green-100 text-green-700 text-[10px] rounded hover:bg-green-200"
                  >
                    Iteracyjna Średnia
                  </button>
                  <button
                    onClick={binarizeEntropy}
                    className="px-1 py-1 bg-green-100 text-green-700 text-[10px] rounded hover:bg-green-200"
                  >
                    Entropia
                  </button>
                </div>
              </div>

              {/* 4. Morfologia */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700 flex items-center gap-2">
                  <Layers size={18} /> Morfologia
                </h3>
                <div className="mb-2">
                  <textarea
                    value={morphKernelStr}
                    onChange={(e) => setMorphKernelStr(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-[10px] font-mono"
                    rows={3}
                    placeholder="Kernel..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => applyMorphology("dilation")}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    Dylatacja
                  </button>
                  <button
                    onClick={() => applyMorphology("erosion")}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    Erozja
                  </button>
                  <button
                    onClick={() => applyMorphology("opening")}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    Otwarcie
                  </button>
                  <button
                    onClick={() => applyMorphology("closing")}
                    className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                  >
                    Domknięcie
                  </button>
                </div>
              </div>

              {/* 5. Operacje Punktowe */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-2 text-gray-700 text-sm flex items-center gap-2">
                  <Sun size={18} /> Operacje Punktowe
                </h3>
                <div className="space-y-3">
                  {/* Brightness & Grayscale */}
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => applyPointTransform("brightness", brightnessValue, { r: 0, g: 0, b: 0 })}
                        className="flex-1 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                      >
                        Jasność
                      </button>
                      <input
                        type="number"
                        value={brightnessValue}
                        onChange={(e) => setBrightnessValue(Number(e.target.value))}
                        className="w-12 border rounded text-xs px-1 text-center"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button onClick={toGrayscaleAverage} className="py-1 bg-gray-200 text-xs rounded">
                        Szary (Avg)
                      </button>
                      <button onClick={toGrayscaleWeighted} className="py-1 bg-gray-200 text-xs rounded">
                        Szary (Wag)
                      </button>
                    </div>
                  </div>

                  {/* Add */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Dodawanie</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="R"
                        value={addColor.r}
                        onChange={(e) => setAddColor((p) => ({ ...p, r: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <input
                        type="number"
                        placeholder="G"
                        value={addColor.g}
                        onChange={(e) => setAddColor((p) => ({ ...p, g: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <input
                        type="number"
                        placeholder="B"
                        value={addColor.b}
                        onChange={(e) => setAddColor((p) => ({ ...p, b: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <button
                        onClick={() => applyPointTransform("add", 0, addColor)}
                        className="px-2 bg-blue-600 text-white rounded text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Subtract */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Odejmowanie</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="R"
                        value={subtractColor.r}
                        onChange={(e) => setSubtractColor((p) => ({ ...p, r: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <input
                        type="number"
                        placeholder="G"
                        value={subtractColor.g}
                        onChange={(e) => setSubtractColor((p) => ({ ...p, g: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <input
                        type="number"
                        placeholder="B"
                        value={subtractColor.b}
                        onChange={(e) => setSubtractColor((p) => ({ ...p, b: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <button
                        onClick={() => applyPointTransform("subtract", 0, subtractColor)}
                        className="px-2 bg-blue-600 text-white rounded text-xs"
                      >
                        -
                      </button>
                    </div>
                  </div>

                  {/* Multiply */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Mnożenie</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="R"
                        value={multiplyColor.r}
                        onChange={(e) => setMultiplyColor((p) => ({ ...p, r: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="G"
                        value={multiplyColor.g}
                        onChange={(e) => setMultiplyColor((p) => ({ ...p, g: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="B"
                        value={multiplyColor.b}
                        onChange={(e) => setMultiplyColor((p) => ({ ...p, b: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <button
                        onClick={() => applyPointTransform("multiply", 0, multiplyColor)}
                        className="px-2 bg-blue-600 text-white rounded text-xs"
                      >
                        ×
                      </button>
                    </div>
                  </div>

                  {/* Divide */}
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold">Dzielenie</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        step="0.1"
                        placeholder="R"
                        value={divideColor.r}
                        onChange={(e) => setDivideColor((p) => ({ ...p, r: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="G"
                        value={divideColor.g}
                        onChange={(e) => setDivideColor((p) => ({ ...p, g: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <input
                        type="number"
                        step="0.1"
                        placeholder="B"
                        value={divideColor.b}
                        onChange={(e) => setDivideColor((p) => ({ ...p, b: Number(e.target.value) }))}
                        className="w-full px-1 py-1 border rounded text-xs"
                      />
                      <button
                        onClick={() => applyPointTransform("divide", 0, divideColor)}
                        className="px-2 bg-blue-600 text-white rounded text-xs"
                      >
                        ÷
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. Filtry */}
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-2 text-gray-700 text-sm flex items-center gap-2">
                  <ArrowRightLeft size={18} /> Filtry ({filterSize}x{filterSize})
                </h3>
                <input
                  type="range"
                  min="3"
                  max="9"
                  step="2"
                  value={filterSize}
                  onChange={(e) => setFilterSize(Number(e.target.value))}
                  className="w-full h-1 mb-2"
                />
                <div className="grid grid-cols-2 gap-1">
                  <button onClick={applyAverageFilter} className="py-1 bg-orange-100 text-orange-800 text-xs rounded">
                    Średnia
                  </button>
                  <button onClick={applyMedianFilter} className="py-1 bg-orange-100 text-orange-800 text-xs rounded">
                    Mediana
                  </button>
                  <button onClick={applySobelFilter} className="py-1 bg-orange-100 text-orange-800 text-xs rounded">
                    Sobel
                  </button>
                  <button onClick={applySharpenFilter} className="py-1 bg-orange-100 text-orange-800 text-xs rounded">
                    Wyostrz
                  </button>
                  {/* PRZYWRÓCONE: Przycisk Gaussian Blur */}
                  <button
                    onClick={applyGaussianBlur}
                    className="py-1 bg-orange-100 text-orange-800 text-xs rounded col-span-2"
                  >
                    Gaussian Blur
                  </button>
                </div>
                <div className="mt-2 border-t pt-2">
                  <textarea
                    value={customMask}
                    onChange={(e) => setCustomMask(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-[10px] font-mono mb-1"
                    rows={2}
                  />
                  <button
                    onClick={applyCustomMask}
                    className="w-full py-1 bg-orange-200 text-orange-900 text-xs rounded"
                  >
                    Własna maska
                  </button>
                </div>
              </div>

              {/* 7. Eksport */}
              <div className="bg-white p-4 rounded-lg shadow">
                {/* PRZYWRÓCONE: Suwak Jakości JPEG */}
                <div className="mb-2">
                  <label className="text-[10px] text-gray-600 block mb-1">Jakość JPEG: {jpegQuality}%</label>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={jpegQuality}
                    onChange={(e) => setJpegQuality(Number(e.target.value))}
                    className="w-full h-1"
                  />
                </div>
                <button
                  onClick={handleSaveJPEG}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Download size={16} /> Zapisz JPEG
                </button>
              </div>
            </>
          )}
        </div>

        {/* PRAWA KOLUMNA - PODGLĄD + HISTOGRAM */}
        <div className="lg:col-span-3 space-y-6">
          {/* Główny Canvas */}
          <div className="bg-white p-4 rounded-lg shadow h-fit">
            <h3 className="font-semibold text-gray-700 mb-4">Podgląd obrazu</h3>
            {loading && <div className="flex items-center justify-center h-64 text-gray-500">Wczytywanie...</div>}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>
            )}

            {!loading && !currentImage && !error && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed rounded-lg">
                <Upload size={48} className="mb-2 opacity-50" />
                <p>Wczytaj obraz PPM lub JPEG</p>
              </div>
            )}

            <div className="overflow-auto max-h-[600px] border border-gray-200 rounded bg-gray-50 flex items-start justify-center">
              <canvas ref={canvasRef} className="max-w-none shadow-sm" />
            </div>
          </div>

          {/* Histogram Canvas */}
          {currentImage && (
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-700">Histogram jasności</h3>
                {autoThreshold !== null && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Auto Próg: {autoThreshold}</span>
                )}
              </div>
              <div className="border border-gray-200 rounded p-2 bg-gray-50">
                <canvas ref={histogramRef} className="w-full h-64" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Task2Combined;
