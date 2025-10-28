import { useEffect, useState } from "react";

const Converter = () => {
  const [inputSpace, setInputSpace] = useState<"RGB" | "CMYK">("RGB");

  // RGB values (0-255)
  const [r, setR] = useState(128);
  const [g, setG] = useState(64);
  const [b, setB] = useState(192);

  // CMYK values (0-100)
  const [c, setC] = useState(0);
  const [m, setM] = useState(0);
  const [y, setY] = useState(0);
  const [k, setK] = useState(0);

  // RGB to CMYK conversion
  const rgbToCmyk = (r: number, g: number, b: number) => {
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;

    const black = Math.min(1 - rNorm, 1 - gNorm, 1 - bNorm);

    if (black === 1) {
      return { c: 0, m: 0, y: 0, k: 100 };
    }

    const cyan = ((1 - rNorm - black) / (1 - black)) * 100;
    const magenta = ((1 - gNorm - black) / (1 - black)) * 100;
    const yellow = ((1 - bNorm - black) / (1 - black)) * 100;

    return { c: cyan, m: magenta, y: yellow, k: black * 100 };
  };

  // CMYK to RGB conversion
  const cmykToRgb = (c: number, m: number, y: number, k: number) => {
    const cNorm = c / 100;
    const mNorm = m / 100;
    const yNorm = y / 100;
    const kNorm = k / 100;

    const red = 255 * (1 - Math.min(1, cNorm * (1 - kNorm) + kNorm));
    const green = 255 * (1 - Math.min(1, mNorm * (1 - kNorm) + kNorm));
    const blue = 255 * (1 - Math.min(1, yNorm * (1 - kNorm) + kNorm));

    return { r: Math.round(red), g: Math.round(green), b: Math.round(blue) };
  };

  // Update conversions when values change
  useEffect(() => {
    if (inputSpace === "RGB") {
      const cmyk = rgbToCmyk(r, g, b);
      setC(Math.round(cmyk.c));
      setM(Math.round(cmyk.m));
      setY(Math.round(cmyk.y));
      setK(Math.round(cmyk.k));
    } else {
      const rgb = cmykToRgb(c, m, y, k);
      setR(rgb.r);
      setG(rgb.g);
      setB(rgb.b);
    }
  }, [r, g, b, c, m, y, k, inputSpace]);

  const currentRgbColor = `rgb(${r}, ${g}, ${b})`;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      {/* RGB/CMYK Input */}
      <div className="space-y-4">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setInputSpace("RGB")}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
              inputSpace === "RGB" ? "bg-red-600 text-white" : "bg-gray-200"
            }`}
          >
            RGB
          </button>
          <button
            onClick={() => setInputSpace("CMYK")}
            className={`flex-1 px-3 py-2 rounded text-sm font-medium ${
              inputSpace === "CMYK" ? "bg-cyan-600 text-white" : "bg-gray-200"
            }`}
          >
            CMYK
          </button>
        </div>

        {inputSpace === "RGB" ? (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-red-700">Red</label>
                <span className="text-sm font-mono">{r}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={r}
                onChange={(e) => setR(parseInt(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min="0"
                max="255"
                value={r}
                onChange={(e) => setR(Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))}
                className="w-full mt-2 px-3 py-2 border rounded"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-green-700">Green</label>
                <span className="text-sm font-mono">{g}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={g}
                onChange={(e) => setG(parseInt(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min="0"
                max="255"
                value={g}
                onChange={(e) => setG(Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))}
                className="w-full mt-2 px-3 py-2 border rounded"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-blue-700">Blue</label>
                <span className="text-sm font-mono">{b}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={b}
                onChange={(e) => setB(parseInt(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min="0"
                max="255"
                value={b}
                onChange={(e) => setB(Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))}
                className="w-full mt-2 px-3 py-2 border rounded"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-cyan-700">Cyan</label>
                <span className="text-sm font-mono">{c}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={c}
                onChange={(e) => setC(parseInt(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={c}
                onChange={(e) => setC(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className="w-full mt-2 px-3 py-2 border rounded"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-pink-700">Magenta</label>
                <span className="text-sm font-mono">{m}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={m}
                onChange={(e) => setM(parseInt(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={m}
                onChange={(e) => setM(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className="w-full mt-2 px-3 py-2 border rounded"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-yellow-700">Yellow</label>
                <span className="text-sm font-mono">{y}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={y}
                onChange={(e) => setY(parseInt(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={y}
                onChange={(e) => setY(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className="w-full mt-2 px-3 py-2 border rounded"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Black</label>
                <span className="text-sm font-mono">{k}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={k}
                onChange={(e) => setK(parseInt(e.target.value))}
                className="w-full"
              />
              <input
                type="number"
                min="0"
                max="100"
                value={k}
                onChange={(e) => setK(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                className="w-full mt-2 px-3 py-2 border rounded"
              />
            </div>
          </div>
        )}
      </div>

      {/* Color Preview */}
      <div className="space-y-4">
        <h3 className="font-semibold mb-3 text-center">Podgląd koloru</h3>
        <div
          className="w-full h-64 rounded-lg border-4 border-gray-300 shadow-lg"
          style={{ backgroundColor: currentRgbColor }}
        />
        <div className="mt-4 text-center">
          <p className="text-sm font-mono bg-white px-3 py-2 rounded border">{currentRgbColor}</p>
          <p className="text-sm font-mono bg-white px-3 py-2 rounded border mt-2">
            HEX: #{r.toString(16).padStart(2, "0").toUpperCase()}
            {g.toString(16).padStart(2, "0").toUpperCase()}
            {b.toString(16).padStart(2, "0").toUpperCase()}
          </p>
        </div>
      </div>

      {/* Converted Values */}
      <div className="space-y-4">
        <h3 className="font-semibold mb-3 text-center">
          {inputSpace === "RGB" ? "Konwersja do CMYK" : "Konwersja do RGB"}
        </h3>

        {inputSpace === "RGB" ? (
          <div className="space-y-3">
            <div className="bg-white p-3 rounded border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-cyan-700">Cyan:</span>
                <span className="text-lg font-mono font-bold">{c}%</span>
              </div>
              <div className="mt-2 h-3 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-cyan-500" style={{ width: `${c}%` }} />
              </div>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-pink-700">Magenta:</span>
                <span className="text-lg font-mono font-bold">{m}%</span>
              </div>
              <div className="mt-2 h-3 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-pink-500" style={{ width: `${m}%` }} />
              </div>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-yellow-700">Yellow:</span>
                <span className="text-lg font-mono font-bold">{y}%</span>
              </div>
              <div className="mt-2 h-3 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-yellow-400" style={{ width: `${y}%` }} />
              </div>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">Black:</span>
                <span className="text-lg font-mono font-bold">{k}%</span>
              </div>
              <div className="mt-2 h-3 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-gray-800" style={{ width: `${k}%` }} />
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-center font-mono">
                CMYK({c}, {m}, {y}, {k})
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white p-3 rounded border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-700">Red:</span>
                <span className="text-lg font-mono font-bold">{r}</span>
              </div>
              <div className="mt-2 h-3 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: `${(r / 255) * 100}%` }} />
              </div>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-700">Green:</span>
                <span className="text-lg font-mono font-bold">{g}</span>
              </div>
              <div className="mt-2 h-3 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-green-500" style={{ width: `${(g / 255) * 100}%` }} />
              </div>
            </div>

            <div className="bg-white p-3 rounded border">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-700">Blue:</span>
                <span className="text-lg font-mono font-bold">{b}</span>
              </div>
              <div className="mt-2 h-3 bg-gray-200 rounded overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: `${(b / 255) * 100}%` }} />
              </div>
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-center font-mono">
                RGB({r}, {g}, {b})
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Converter;
