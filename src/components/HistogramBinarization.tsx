import { useRef, useState, useEffect } from "react";
import { Upload, RotateCcw } from "lucide-react";
import { parsePPM } from "../utils/parsePPM";
import type { PPMImage } from "../types/types";

const HistogramBinarization = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const histogramRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<PPMImage | null>(null);
  const [currentImage, setCurrentImage] = useState<PPMImage | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [histogram, setHistogram] = useState<number[]>(new Array(256).fill(0));

  // Parametry binaryzacji
  const [manualThreshold, setManualThreshold] = useState(128);
  const [percentBlack, setPercentBlack] = useState(50);
  const [autoThreshold, setAutoThreshold] = useState<number | null>(null);

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
    canvas.height = 440;

    const marginBottom = 30;
    const marginLeft = 40;
    const plotHeight = canvas.height - marginBottom;
    const plotWidth = canvas.width - marginLeft;

    ctx.fillStyle = "#f9fafb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const maxVal = Math.max(...hist);
    const barWidth = plotWidth / 256;

    // Rysuj histogram
    ctx.fillStyle = "#3b82f6";
    for (let i = 0; i < 256; i++) {
      const barHeight = (hist[i] / maxVal) * (plotHeight - 10);
      ctx.fillRect(marginLeft + i * barWidth, plotHeight - barHeight, barWidth, barHeight);
    }

    // Rysuj osie
    ctx.strokeStyle = "#374151";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginLeft, 0);
    ctx.lineTo(marginLeft, plotHeight);
    ctx.lineTo(canvas.width, plotHeight);
    ctx.stroke();

    // Etykiety osi X
    ctx.fillStyle = "#374151";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    const xLabels = [0, 64, 128, 192, 255];
    xLabels.forEach((val) => {
      const x = marginLeft + (val / 255) * plotWidth;
      ctx.fillText(val.toString(), x, plotHeight + 15);
    });
    ctx.fillText("Intensywność", marginLeft + plotWidth / 2, canvas.height - 3);

    // Etykiety osi Y
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const ySteps = 4;
    for (let i = 0; i <= ySteps; i++) {
      const val = Math.round((maxVal / ySteps) * i);
      const y = plotHeight - (i / ySteps) * (plotHeight - 10);
      ctx.fillText(val.toString(), marginLeft - 5, y);
    }
    ctx.save();
    ctx.translate(12, plotHeight / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center";
    ctx.fillText("Liczba pikseli", 0, 0);
    ctx.restore();

    // Rysuj próg jeśli jest ustawiony
    if (autoThreshold !== null) {
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const thresholdX = marginLeft + autoThreshold * barWidth;
      ctx.moveTo(thresholdX, 0);
      ctx.lineTo(thresholdX, plotHeight);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Próg: ${autoThreshold}`, thresholdX + 5, 15);
    }
  };

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

        const hist = calculateHistogram(image);
        setHistogram(hist);
        drawHistogram(hist);

        displayImage(image);
        setLoading(false);
      };
      img.onerror = () => {
        setError("Błąd wczytywania pliku");
        setLoading(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
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

      const hist = calculateHistogram(image);
      setHistogram(hist);
      drawHistogram(hist);

      displayImage(image);
      setError("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetToOriginal = () => {
    if (originalImage) {
      const newImage = {
        ...originalImage,
        pixels: new Uint8ClampedArray(originalImage.pixels),
      };
      setCurrentImage(newImage);
      displayImage(newImage);

      const hist = calculateHistogram(newImage);
      setHistogram(hist);
      drawHistogram(hist);
      setAutoThreshold(null);
    }
  };

  // Normalizacja - rozszerzenie histogramu
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

    const hist = calculateHistogram(newImage);
    setHistogram(hist);
    drawHistogram(hist);
  };

  // Normalizacja - wyrównanie histogramu
  const equalizeHistogram = () => {
    if (!currentImage) return;

    const hist = calculateHistogram(currentImage);
    const totalPixels = currentImage.width * currentImage.height;

    // Oblicz skumulowaną funkcję dystrybucji (CDF)
    const cdf = new Array(256).fill(0);
    cdf[0] = hist[0];
    for (let i = 1; i < 256; i++) {
      cdf[i] = cdf[i - 1] + hist[i];
    }

    // Znajdź minimum CDF (pierwsze niezerowe)
    let cdfMin = 0;
    for (let i = 0; i < 256; i++) {
      if (cdf[i] !== 0) {
        cdfMin = cdf[i];
        break;
      }
    }

    // Oblicz mapowanie
    const mapping = new Array(256);
    for (let i = 0; i < 256; i++) {
      mapping[i] = Math.round(((cdf[i] - cdfMin) / (totalPixels - cdfMin)) * 255);
    }

    // Zastosuj mapowanie
    const newPixels = new Uint8ClampedArray(currentImage.pixels);
    for (let i = 0; i < newPixels.length; i += 4) {
      const gray = Math.round(0.299 * newPixels[i] + 0.587 * newPixels[i + 1] + 0.114 * newPixels[i + 2]);
      const newGray = mapping[gray];
      newPixels[i] = newGray;
      newPixels[i + 1] = newGray;
      newPixels[i + 2] = newGray;
    }

    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);

    const newHist = calculateHistogram(newImage);
    setHistogram(newHist);
    drawHistogram(newHist);
  };

  // Binaryzacja manualna
  const binarizeManual = (threshold: number) => {
    if (!currentImage) return;

    const newPixels = new Uint8ClampedArray(currentImage.pixels);

    for (let i = 0; i < newPixels.length; i += 4) {
      const gray = Math.round(0.299 * newPixels[i] + 0.587 * newPixels[i + 1] + 0.114 * newPixels[i + 2]);
      const binary = gray >= threshold ? 255 : 0;
      newPixels[i] = binary;
      newPixels[i + 1] = binary;
      newPixels[i + 2] = binary;
    }

    const newImage = { ...currentImage, pixels: newPixels };
    setCurrentImage(newImage);
    displayImage(newImage);
    setAutoThreshold(threshold);

    const hist = calculateHistogram(newImage);
    setHistogram(hist);
    drawHistogram(hist);
  };

  // Procentowa selekcja czarnego
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

    setManualThreshold(threshold);
    setAutoThreshold(threshold);
    binarizeManual(threshold);
  };

  // Selekcja iteratywna średniej
  const binarizeMeanIterative = () => {
    if (!currentImage) return;

    const hist = calculateHistogram(currentImage);

    // Oblicz początkową średnią
    let sum = 0,
      count = 0;
    for (let i = 0; i < 256; i++) {
      sum += i * hist[i];
      count += hist[i];
    }
    let threshold = Math.round(sum / count);

    let prevThreshold = -1;
    let iterations = 0;
    const maxIterations = 100;

    while (Math.abs(threshold - prevThreshold) > 1 && iterations < maxIterations) {
      prevThreshold = threshold;

      // Oblicz średnią dla pikseli poniżej progu
      let sum1 = 0,
        count1 = 0;
      for (let i = 0; i < threshold; i++) {
        sum1 += i * hist[i];
        count1 += hist[i];
      }
      const mean1 = count1 > 0 ? sum1 / count1 : 0;

      // Oblicz średnią dla pikseli powyżej progu
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

    setManualThreshold(threshold);
    setAutoThreshold(threshold);
    binarizeManual(threshold);
  };

  // Selekcja entropii
  const binarizeEntropy = () => {
    if (!currentImage) return;

    const hist = calculateHistogram(currentImage);
    const totalPixels = currentImage.width * currentImage.height;

    let maxEntropy = -Infinity;
    let bestThreshold = 128;

    for (let t = 1; t < 255; t++) {
      // Oblicz prawdopodobieństwa dla obu klas
      let p1 = 0,
        p2 = 0;
      for (let i = 0; i < t; i++) p1 += hist[i];
      for (let i = t; i < 256; i++) p2 += hist[i];

      if (p1 === 0 || p2 === 0) continue;

      p1 /= totalPixels;
      p2 /= totalPixels;

      // Oblicz entropię dla obu klas
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

    setManualThreshold(bestThreshold);
    setAutoThreshold(bestThreshold);
    binarizeManual(bestThreshold);
  };

  useEffect(() => {
    if (histogram && histogramRef.current) {
      drawHistogram(histogram);
    }
  }, [histogram, autoThreshold]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Panel kontrolny */}
      <div className="lg:col-span-1 space-y-4">
        {/* Wczytywanie */}
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
            {/* Informacje */}
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

            {/* Normalizacja */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3 text-gray-700">Normalizacja histogramu</h3>
              <div className="space-y-2">
                <button
                  onClick={stretchHistogram}
                  className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                >
                  Rozszerzenie histogramu
                </button>
                <button
                  onClick={equalizeHistogram}
                  className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                >
                  Wyrównanie histogramu
                </button>
              </div>
            </div>

            {/* Binaryzacja */}
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-3 text-gray-700">Binaryzacja</h3>

              {/* Manualna */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-600 block mb-2">Ręczny próg: {manualThreshold}</label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={manualThreshold}
                  onChange={(e) => setManualThreshold(Number(e.target.value))}
                  className="w-full mb-2"
                />
                <button
                  onClick={() => binarizeManual(manualThreshold)}
                  className="w-full px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
                >
                  Zastosuj ręczny próg
                </button>
              </div>

              {/* Procentowa selekcja */}
              <div className="mb-4 pt-3 border-t">
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  % czarnych pikseli: {percentBlack}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={percentBlack}
                  onChange={(e) => setPercentBlack(Number(e.target.value))}
                  className="w-full mb-2"
                />
                <button
                  onClick={() => binarizePercentBlack(percentBlack)}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Procentowa selekcja
                </button>
              </div>

              {/* Automatyczne metody */}
              <div className="space-y-2 pt-3 border-t">
                <button
                  onClick={binarizeMeanIterative}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Iteracyjna średnia
                </button>
                <button
                  onClick={binarizeEntropy}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Selekcja entropii
                </button>
              </div>

              {autoThreshold !== null && (
                <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                  <span className="font-medium">Automatyczny próg:</span> {autoThreshold}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Obszar wyświetlania */}
      <div className="lg:col-span-3 space-y-6">
        {/* Obraz */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold text-gray-700 mb-4">Obraz</h3>

          {loading && <div className="flex items-center justify-center h-96 text-gray-500">Wczytywanie...</div>}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Błąd:</strong> {error}
            </div>
          )}

          {!loading && !currentImage && !error && (
            <div className="flex items-center justify-center h-96 text-gray-500">Wczytaj obraz, aby rozpocząć</div>
          )}

          <div className="overflow-auto max-h-[600px] border-2 border-gray-300 rounded bg-gray-50">
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* Histogram */}
        {currentImage && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700 mb-4">Histogram</h3>
            <div className="border-2 border-gray-300 rounded bg-white">
              <canvas ref={histogramRef} className="w-full" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistogramBinarization;
