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
  Image as ImageIcon,
  Move,
  ScanSearch,
} from "lucide-react";
import type { PPMImage } from "../types/types";
import { parsePPM } from "../utils/parsePPM";

const Task2PPM = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const histogramRef = useRef<HTMLCanvasElement>(null);

  // --- Stan Obrazu ---
  const [originalImage, setOriginalImage] = useState<PPMImage | null>(null);
  const [currentImage, setCurrentImage] = useState<PPMImage | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
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
  // LOGIKA (Bez zmian - skrócona dla czytelności)
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

    const containerWidth = canvas.parentElement?.clientWidth || 300;
    canvas.width = containerWidth;
    canvas.height = 180;

    const marginBottom = 20;
    const marginLeft = 30;
    const plotHeight = canvas.height - marginBottom;
    const plotWidth = canvas.width - marginLeft;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const maxVal = Math.max(...hist);
    const barWidth = plotWidth / 256;

    ctx.fillStyle = "#6366f1";
    for (let i = 0; i < 256; i++) {
      const barHeight = (hist[i] / maxVal) * (plotHeight - 10);
      ctx.fillRect(marginLeft + i * barWidth, plotHeight - barHeight, barWidth, barHeight);
    }

    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginLeft, 0);
    ctx.lineTo(marginLeft, plotHeight);
    ctx.lineTo(canvas.width, plotHeight);
    ctx.stroke();

    ctx.fillStyle = "#6b7280";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    [0, 128, 255].forEach((val) => {
      const x = marginLeft + (val / 255) * plotWidth;
      ctx.fillText(val.toString(), x, plotHeight + 14);
    });

    if (autoThreshold !== null || binThreshold !== null) {
      const valToShow = autoThreshold !== null ? autoThreshold : binThreshold;
      const thresholdX = marginLeft + valToShow * barWidth;

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(thresholdX, 0);
      ctx.lineTo(thresholdX, plotHeight);
      ctx.stroke();
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
  }, [histogram, autoThreshold, binThreshold, currentImage]);

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
    if (!currentImage) return alert("Najpierw wczytaj obraz");
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "processed_image.jpg";
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
      const width = kernel[0].length;
      if (!kernel.every((row) => row.length === width)) throw new Error();
      return kernel;
    } catch {
      alert("Błąd parsowania kernela. Użyj formatu: 0,1,0 (nowa linia) 1,1,1...");
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

  const performHitOrMiss = (
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    kernel: number[][]
  ): Uint8ClampedArray => {
    const hitMap = new Uint8ClampedArray(pixels.length).fill(0);
    for (let i = 3; i < hitMap.length; i += 4) hitMap[i] = 255;

    const kh = kernel.length;
    const kw = kernel[0].length;
    const cy = Math.floor(kh / 2);
    const cx = Math.floor(kw / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let isMatch = true;
        for (let ky = 0; ky < kh; ky++) {
          for (let kx = 0; kx < kw; kx++) {
            const kVal = kernel[ky][kx];
            if (kVal === -1) continue;
            const py = y + ky - cy;
            const px = x + kx - cx;
            let pixelVal = 0;
            if (py >= 0 && py < height && px >= 0 && px < width) {
              const idx = (py * width + px) * 4;
              pixelVal = pixels[idx] > 128 ? 1 : 0;
            }
            if (kVal === 1 && pixelVal !== 1) {
              isMatch = false;
              break;
            }
            if (kVal === 0 && pixelVal !== 0) {
              isMatch = false;
              break;
            }
          }
          if (!isMatch) break;
        }
        if (isMatch) {
          const idx = (y * width + x) * 4;
          hitMap[idx] = 255;
          hitMap[idx + 1] = 255;
          hitMap[idx + 2] = 255;
        }
      }
    }
    return hitMap;
  };

  const applyHitOrMissOperation = (mode: "basic" | "thinning" | "thickening") => {
    if (!currentImage) return;
    const kernel = parseMorphKernel();
    if (!kernel) return;

    const hitMap = performHitOrMiss(currentImage.pixels, currentImage.width, currentImage.height, kernel);

    if (mode === "basic") {
      const newImage = { ...currentImage, pixels: hitMap };
      setCurrentImage(newImage);
      displayImage(newImage);
      return;
    }

    const newPixels = new Uint8ClampedArray(currentImage.pixels);
    for (let i = 0; i < newPixels.length; i += 4) {
      const isHit = hitMap[i] === 255;
      if (mode === "thinning") {
        if (isHit) {
          newPixels[i] = 0;
          newPixels[i + 1] = 0;
          newPixels[i + 2] = 0;
        }
      } else if (mode === "thickening") {
        if (isHit) {
          newPixels[i] = 255;
          newPixels[i + 1] = 255;
          newPixels[i + 2] = 255;
        }
      }
    }
    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
  };

  // Zwracamy UI
  return (
    <div className="w-full h-screen flex flex-col bg-gray-50 overflow-hidden font-sans text-gray-800">
      {/* 1. GÓRNY PASEK (HEADER) */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-lg">
            <ImageIcon /> <span>PPM Editor</span>
          </div>
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <div className="flex gap-2">
            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors">
              <Upload size={14} /> Wczytaj PPM
              <input type="file" accept=".ppm" onChange={handleLoadPPM} className="hidden" />
            </label>
            <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors">
              <Upload size={14} /> Wczytaj JPG
              <input type="file" accept=".jpg,.jpeg" onChange={handleLoadJPEG} className="hidden" />
            </label>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {currentImage && (
            <>
              <span className="text-xs text-gray-400 mr-2">
                {currentImage.width} x {currentImage.height} px
              </span>
              <button
                onClick={resetToOriginal}
                className="text-gray-500 hover:text-gray-800 p-2 rounded-md hover:bg-gray-100 transition-colors"
                title="Resetuj obraz"
              >
                <RotateCcw size={18} />
              </button>
              <div className="h-6 w-px bg-gray-200 mx-1"></div>
              <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                <span className="text-[10px] font-bold text-gray-500">JAKOŚĆ JPG</span>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={jpegQuality}
                  onChange={(e) => setJpegQuality(Number(e.target.value))}
                  className="w-20 h-1 accent-indigo-600 cursor-pointer"
                />
                <span className="text-[10px] w-6 text-right">{jpegQuality}%</span>
              </div>
              <button
                onClick={handleSaveJPEG}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
              >
                <Download size={14} /> Zapisz
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. GŁÓWNA ZAWARTOŚĆ */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEWY PANEL - NARZĘDZIA */}
        <aside className="w-80 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-5">
            {!currentImage ? (
              <div className="text-center text-gray-400 mt-10 text-sm">Wczytaj obraz, aby zobaczyć narzędzia.</div>
            ) : (
              <>
                {/* Filtry */}
                <PanelSection title="Filtry Splotowe" icon={ArrowRightLeft}>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-gray-600">Rozmiar maski:</span>
                    <span className="font-mono bg-gray-100 px-2 rounded">
                      {filterSize}x{filterSize}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="9"
                    step="2"
                    value={filterSize}
                    onChange={(e) => setFilterSize(Number(e.target.value))}
                    className="w-full h-1.5 accent-indigo-600 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-3"
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <ActionButton variant="secondary" onClick={applyAverageFilter}>
                      Średnia
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={applyMedianFilter}>
                      Mediana
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={applySobelFilter}>
                      Sobel
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={applySharpenFilter}>
                      Wyostrz
                    </ActionButton>
                    <div className="col-span-2">
                      <ActionButton variant="secondary" onClick={applyGaussianBlur}>
                        Gaussian Blur (5x5)
                      </ActionButton>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 mb-1">WŁASNA MASKA</p>
                    <textarea
                      value={customMask}
                      onChange={(e) => setCustomMask(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-md text-[10px] font-mono mb-2 bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none"
                      rows={3}
                    />
                    <ActionButton variant="outline" onClick={applyCustomMask}>
                      Zastosuj Maskę
                    </ActionButton>
                  </div>
                </PanelSection>

                {/* Morfologia */}
                <PanelSection title="Morfologia" icon={Layers}>
                  <div className="mb-2">
                    <p className="text-[10px] font-bold text-gray-400 mb-1">KERNEL (0, 1, -1)</p>
                    <p className="text-[9px] text-gray-400 mb-1 italic">-1 oznacza "Don't Care" (dla Hit-or-Miss)</p>
                    <textarea
                      value={morphKernelStr}
                      onChange={(e) => setMorphKernelStr(e.target.value)}
                      className="w-full p-2 border border-gray-200 rounded-md text-[10px] font-mono bg-gray-50 focus:bg-white focus:border-indigo-500 outline-none"
                      rows={3}
                      placeholder="0,1,0&#10;1,1,1&#10;0,1,0"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <ActionButton variant="secondary" onClick={() => applyMorphology("dilation")}>
                      Dylatacja
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={() => applyMorphology("erosion")}>
                      Erozja
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={() => applyMorphology("opening")}>
                      Otwarcie
                    </ActionButton>
                    <ActionButton variant="secondary" onClick={() => applyMorphology("closing")}>
                      Domknięcie
                    </ActionButton>
                  </div>

                  {/* Sekcja Hit-or-Miss */}
                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-500">
                      <ScanSearch size={12} /> HIT-OR-MISS
                    </div>
                    <div className="space-y-2">
                      <ActionButton variant="outline" onClick={() => applyHitOrMissOperation("basic")}>
                        Pokaż Trafienia (Basic)
                      </ActionButton>
                      <div className="grid grid-cols-2 gap-2">
                        <ActionButton variant="secondary" onClick={() => applyHitOrMissOperation("thinning")}>
                          Pocienianie
                        </ActionButton>
                        <ActionButton variant="secondary" onClick={() => applyHitOrMissOperation("thickening")}>
                          Pogrubianie
                        </ActionButton>
                      </div>
                    </div>
                    <p className="text-[9px] text-gray-400 mt-2 italic text-center">
                      Wymaga obrazu binarnego (użyj Binaryzacji w prawym panelu).
                    </p>
                  </div>
                </PanelSection>

                {/* Operacje Punktowe */}
                <PanelSection title="Operacje Punktowe" icon={Sun}>
                  <div className="space-y-4">
                    {/* Jasność */}
                    <div className="bg-gray-50 p-2 rounded-md border border-gray-100">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-gray-500">JASNOŚĆ</label>
                        <span className="text-[10px] font-mono">{brightnessValue}</span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="100"
                        value={brightnessValue}
                        onChange={(e) => setBrightnessValue(Number(e.target.value))}
                        className="w-full h-1.5 accent-indigo-600 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                      />
                      <ActionButton
                        variant="primary"
                        onClick={() => applyPointTransform("brightness", brightnessValue, { r: 0, g: 0, b: 0 })}
                      >
                        Zastosuj
                      </ActionButton>
                    </div>

                    {/* Skala Szarości */}
                    <div className="grid grid-cols-2 gap-2">
                      <ActionButton variant="outline" onClick={toGrayscaleAverage}>
                        Szary (Avg)
                      </ActionButton>
                      <ActionButton variant="outline" onClick={toGrayscaleWeighted}>
                        Szary (Wag)
                      </ActionButton>
                    </div>

                    {/* RGB Ops */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-1 items-center">
                        <span className="text-[10px] font-bold text-gray-400">DODAJ</span>
                        <RGBInput label="R" value={addColor.r} onChange={(v) => setAddColor((p) => ({ ...p, r: v }))} />
                        <RGBInput label="G" value={addColor.g} onChange={(v) => setAddColor((p) => ({ ...p, g: v }))} />
                        <RGBInput label="B" value={addColor.b} onChange={(v) => setAddColor((p) => ({ ...p, b: v }))} />
                      </div>
                      <ActionButton variant="secondary" onClick={() => applyPointTransform("add", 0, addColor)}>
                        +
                      </ActionButton>

                      <div className="border-t border-gray-100 my-2"></div>

                      <div className="grid grid-cols-4 gap-1 items-center">
                        <span className="text-[10px] font-bold text-gray-400">ODEJMIJ</span>
                        <RGBInput
                          label="R"
                          value={subtractColor.r}
                          onChange={(v) => setSubtractColor((p) => ({ ...p, r: v }))}
                        />
                        <RGBInput
                          label="G"
                          value={subtractColor.g}
                          onChange={(v) => setSubtractColor((p) => ({ ...p, g: v }))}
                        />
                        <RGBInput
                          label="B"
                          value={subtractColor.b}
                          onChange={(v) => setSubtractColor((p) => ({ ...p, b: v }))}
                        />
                      </div>
                      <ActionButton
                        variant="secondary"
                        onClick={() => applyPointTransform("subtract", 0, subtractColor)}
                      >
                        -
                      </ActionButton>

                      <div className="border-t border-gray-100 my-2"></div>

                      <div className="grid grid-cols-4 gap-1 items-center">
                        <span className="text-[10px] font-bold text-gray-400">MNOŻENIE</span>
                        <RGBInput
                          label="R"
                          value={multiplyColor.r}
                          onChange={(v) => setMultiplyColor((p) => ({ ...p, r: v }))}
                        />
                        <RGBInput
                          label="G"
                          value={multiplyColor.g}
                          onChange={(v) => setMultiplyColor((p) => ({ ...p, g: v }))}
                        />
                        <RGBInput
                          label="B"
                          value={multiplyColor.b}
                          onChange={(v) => setMultiplyColor((p) => ({ ...p, b: v }))}
                        />
                      </div>
                      <ActionButton
                        variant="secondary"
                        onClick={() => applyPointTransform("multiply", 0, multiplyColor)}
                      >
                        ×
                      </ActionButton>

                      <div className="border-t border-gray-100 my-2"></div>

                      <div className="grid grid-cols-4 gap-1 items-center">
                        <span className="text-[10px] font-bold text-gray-400">DZIELENIE</span>
                        <RGBInput
                          label="R"
                          value={divideColor.r}
                          onChange={(v) => setDivideColor((p) => ({ ...p, r: v }))}
                        />
                        <RGBInput
                          label="G"
                          value={divideColor.g}
                          onChange={(v) => setDivideColor((p) => ({ ...p, g: v }))}
                        />
                        <RGBInput
                          label="B"
                          value={divideColor.b}
                          onChange={(v) => setDivideColor((p) => ({ ...p, b: v }))}
                        />
                      </div>
                      <ActionButton variant="secondary" onClick={() => applyPointTransform("divide", 0, divideColor)}>
                        ÷
                      </ActionButton>
                    </div>
                  </div>
                </PanelSection>
              </>
            )}
          </div>
        </aside>

        {/* ŚRODEK - CANVAS */}
        <main className="flex-1 bg-gray-900 relative overflow-auto flex items-center justify-center p-8 shadow-inner">
          {loading && <div className="text-white text-lg animate-pulse">Przetwarzanie...</div>}

          {!loading && !currentImage && !error && (
            <div className="text-gray-500 flex flex-col items-center gap-4">
              <div className="bg-gray-800 p-6 rounded-full">
                <Move size={48} className="opacity-50" />
              </div>
              <p>Przestrzeń robocza pusta</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-200 px-6 py-4 rounded-lg backdrop-blur-sm max-w-md">
              <strong className="block mb-1 text-red-100">Wystąpił błąd</strong>
              {error}
            </div>
          )}

          <div className={`transition-opacity duration-300 ${loading ? "opacity-50" : "opacity-100"}`}>
            <canvas ref={canvasRef} className="max-w-none" style={{ imageRendering: "pixelated" }} />
          </div>
        </main>

        {/* PRAWY PANEL - ANALIZA */}
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-5">
            {!currentImage ? (
              <div className="text-center text-gray-400 mt-10 text-sm">Brak danych do analizy.</div>
            ) : (
              <>
                {/* Histogram */}
                <PanelSection title="Histogram" icon={BarChart}>
                  <div className="bg-gray-50 border border-gray-100 rounded-lg p-2 mb-3">
                    <canvas ref={histogramRef} className="w-full h-40" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={stretchHistogram}
                      className="flex flex-col items-center justify-center p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors text-xs font-medium"
                    >
                      <Maximize size={16} className="mb-1" /> Rozszerz
                    </button>
                    <button
                      onClick={equalizeHistogram}
                      className="flex flex-col items-center justify-center p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md transition-colors text-xs font-medium"
                    >
                      <RefreshCcw size={16} className="mb-1" /> Wyrównaj
                    </button>
                  </div>
                </PanelSection>

                {/* Binaryzacja */}
                <PanelSection title="Binaryzacja" icon={Binary}>
                  <div className="space-y-4">
                    {/* Manual */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-gray-500">PRÓG (MANUALNY)</label>
                        <span className="text-[10px] font-mono bg-gray-100 px-1 rounded">{binThreshold}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={binThreshold}
                        onChange={(e) => setBinThreshold(Number(e.target.value))}
                        className="w-full h-1.5 accent-indigo-600 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                      />
                      <ActionButton onClick={() => binarizeManual(binThreshold)}>Binaryzuj (Próg)</ActionButton>
                    </div>

                    {/* Procent */}
                    <div className="pt-3 border-t border-dashed border-gray-200">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-bold text-gray-500">% CZERNI</label>
                        <span className="text-[10px] font-mono bg-gray-100 px-1 rounded">{percentBlack}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={percentBlack}
                        onChange={(e) => setPercentBlack(Number(e.target.value))}
                        className="w-full h-1.5 accent-indigo-600 bg-gray-200 rounded-lg appearance-none cursor-pointer mb-2"
                      />
                      <ActionButton variant="outline" onClick={() => binarizePercentBlack(percentBlack)}>
                        Selekcja %
                      </ActionButton>
                    </div>

                    {/* Automaty */}
                    <div className="pt-3 border-t border-dashed border-gray-200">
                      <label className="text-[10px] font-bold text-gray-500 block mb-2">ALGORYTMY AUTO</label>
                      <div className="grid grid-cols-2 gap-2">
                        <ActionButton variant="secondary" onClick={binarizeMeanIterative}>
                          Iter. Średnia
                        </ActionButton>
                        <ActionButton variant="secondary" onClick={binarizeEntropy}>
                          Entropia
                        </ActionButton>
                      </div>
                    </div>
                  </div>
                </PanelSection>

                <div className="mt-auto pt-6 text-center">
                  <p className="text-[10px] text-gray-300">PPM Editor v2.0</p>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

const PanelSection = ({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>;
  children: React.ReactNode;
}) => (
  <div className="mb-6 border-b border-gray-100 pb-4 last:border-0">
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
      <Icon size={14} className="text-indigo-600" /> {title}
    </h3>
    <div className="space-y-3">{children}</div>
  </div>
);

const ActionButton = ({
  onClick,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "outline";
}) => {
  const baseClass =
    "px-3 py-1.5 rounded-md text-xs font-medium transition-colors w-full flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline: "border border-gray-200 text-gray-600 hover:bg-gray-50",
  };
  return (
    <button onClick={onClick} className={`${baseClass} ${variants[variant]}`}>
      {children}
    </button>
  );
};

const RGBInput = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
  <div className="relative">
    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">{label}</span>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full pl-6 pr-1 py-1 text-xs border border-gray-200 rounded-md text-right focus:border-indigo-500 outline-none"
    />
  </div>
);

export default Task2PPM;
