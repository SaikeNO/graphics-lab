import { useRef, useState } from "react";
import type { PPMImage } from "../types/types";
import { Download, Upload } from "lucide-react";
import { parsePPM } from "../utils/parsePPM";

const Task2PPM = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ppmImage, setPpmImage] = useState<PPMImage | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [jpegQuality, setJpegQuality] = useState(90);

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
      setPpmImage(image);
      displayImage(image);
      setError("");
    } catch (err) {
      setError((err as Error).message);
      setPpmImage(null);
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

        setPpmImage({
          width: img.width,
          height: img.height,
          maxValue: 255,
          pixels: imageData.data,
          format: "P6",
        });

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
    if (!ppmImage) {
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3 text-gray-700">Wczytaj obraz</h3>
            <div className="space-y-2">
              <label className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium">
                <Upload size={16} />
                Wczytaj PPM (P3/P6)
                <input type="file" accept=".ppm" onChange={handleLoadPPM} className="hidden" />
              </label>
              <label className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium">
                <Upload size={16} />
                Wczytaj JPEG
                <input type="file" accept=".jpg,.jpeg" onChange={handleLoadJPEG} className="hidden" />
              </label>
            </div>
          </div>

          {ppmImage && (
            <>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700">Informacje o obrazie</h3>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Format:</span> {ppmImage.format}
                  </p>
                  <p>
                    <span className="font-medium">Wymiary:</span> {ppmImage.width} x {ppmImage.height}
                  </p>
                  <p>
                    <span className="font-medium">MaxValue:</span> {ppmImage.maxValue}
                  </p>
                  <p>
                    <span className="font-medium">Pikseli:</span> {ppmImage.width * ppmImage.height}
                  </p>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-3 text-gray-700">Jakość JPEG: {jpegQuality}%</h3>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={jpegQuality}
                  onChange={(e) => setJpegQuality(parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs text-gray-600 mt-2 mb-4">Wyższa wartość = lepsza jakość, większy plik</p>

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

        <div className="lg:col-span-3">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-700 mb-4">Podgląd obrazu</h3>

            {loading && <div className="flex items-center justify-center h-96 text-gray-500">Wczytywanie...</div>}

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <strong>Błąd:</strong> {error}
              </div>
            )}

            {!loading && !ppmImage && !error && (
              <div className="flex items-center justify-center h-96 text-gray-500">
                Wczytaj obraz PPM lub JPEG, aby go wyświetlić
              </div>
            )}

            <div className="overflow-auto max-h-[600px] border-2 border-gray-300 rounded">
              <canvas ref={canvasRef} className="bg-gray-50" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Task2PPM;
