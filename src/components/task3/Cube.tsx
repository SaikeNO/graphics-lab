import React, { useState, useRef, useEffect } from "react";
import { RotateCcw } from "lucide-react";

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Point2D {
  x: number;
  y: number;
}

const Cube = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotationX, setRotationX] = useState(30);
  const [rotationY, setRotationY] = useState(45);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState<Point2D>({ x: 0, y: 0 });
  const [showCrossSection, setShowCrossSection] = useState(false);
  const [crossSectionAxis, setCrossSectionAxis] = useState<"x" | "y" | "z">("x");
  const [crossSectionValue, setCrossSectionValue] = useState(128);
  const [cubeSize, setCubeSize] = useState(200);

  useEffect(() => {
    drawCube();
  }, [rotationX, rotationY, showCrossSection, crossSectionAxis, crossSectionValue, cubeSize]);

  const project3DTo2D = (point: Point3D, centerX: number, centerY: number): Point2D => {
    // Rotacja wokół osi Y
    const cosY = Math.cos((rotationY * Math.PI) / 180);
    const sinY = Math.sin((rotationY * Math.PI) / 180);
    const x1 = point.x * cosY - point.z * sinY;
    const z1 = point.x * sinY + point.z * cosY;

    // Rotacja wokół osi X
    const cosX = Math.cos((rotationX * Math.PI) / 180);
    const sinX = Math.sin((rotationX * Math.PI) / 180);
    const y1 = point.y * cosX - z1 * sinX;
    const z2 = point.y * sinX + z1 * cosX;

    // Projekcja perspektywiczna
    const distance = 800;
    const scale = distance / (distance + z2);

    return {
      x: centerX + x1 * scale,
      y: centerY + y1 * scale,
    };
  };

  const rgbToColor = (r: number, g: number, b: number): string => {
    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  };

  const drawCube = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = cubeSize;
    const halfSize = size / 2;

    // Rysowanie wypełnionej kostki z gradientami
    const resolution = 20; // Liczba segmentów na każdej krawędzi

    // Funkcja do rysowania ściany z gradientem
    const drawFace = (corners: Point3D[], colorFunc: (u: number, v: number) => string) => {
      const [c1, c2, c3, c4] = corners.map((c) => project3DTo2D(c, centerX, centerY));

      for (let i = 0; i < resolution; i++) {
        for (let j = 0; j < resolution; j++) {
          const u1 = i / resolution;
          const v1 = j / resolution;
          const u2 = (i + 1) / resolution;
          const v2 = (j + 1) / resolution;

          // Interpolacja pozycji
          const p1 = {
            x: c1.x + (c2.x - c1.x) * u1 + (c4.x - c1.x) * v1 + (c3.x - c2.x - c4.x + c1.x) * u1 * v1,
            y: c1.y + (c2.y - c1.y) * u1 + (c4.y - c1.y) * v1 + (c3.y - c2.y - c4.y + c1.y) * u1 * v1,
          };
          const p2 = {
            x: c1.x + (c2.x - c1.x) * u2 + (c4.x - c1.x) * v1 + (c3.x - c2.x - c4.x + c1.x) * u2 * v1,
            y: c1.y + (c2.y - c1.y) * u2 + (c4.y - c1.y) * v1 + (c3.y - c2.y - c4.y + c1.y) * u2 * v1,
          };
          const p3 = {
            x: c1.x + (c2.x - c1.x) * u2 + (c4.x - c1.x) * v2 + (c3.x - c2.x - c4.x + c1.x) * u2 * v2,
            y: c1.y + (c2.y - c1.y) * u2 + (c4.y - c1.y) * v2 + (c3.y - c2.y - c4.y + c1.y) * u2 * v2,
          };
          const p4 = {
            x: c1.x + (c2.x - c1.x) * u1 + (c4.x - c1.x) * v2 + (c3.x - c2.x - c4.x + c1.x) * u1 * v2,
            y: c1.y + (c2.y - c1.y) * u1 + (c4.y - c1.y) * v2 + (c3.y - c2.y - c4.y + c1.y) * u1 * v2,
          };

          const color = colorFunc((u1 + u2) / 2, (v1 + v2) / 2);
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.lineTo(p4.x, p4.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    };

    // Definiowanie wierzchołków kostki
    const vertices: Point3D[] = [
      { x: -halfSize, y: -halfSize, z: -halfSize }, // 0: (0,0,0) - czarny
      { x: halfSize, y: -halfSize, z: -halfSize }, // 1: (255,0,0) - czerwony
      { x: halfSize, y: halfSize, z: -halfSize }, // 2: (255,255,0) - żółty
      { x: -halfSize, y: halfSize, z: -halfSize }, // 3: (0,255,0) - zielony
      { x: -halfSize, y: -halfSize, z: halfSize }, // 4: (0,0,255) - niebieski
      { x: halfSize, y: -halfSize, z: halfSize }, // 5: (255,0,255) - magenta
      { x: halfSize, y: halfSize, z: halfSize }, // 6: (255,255,255) - biały
      { x: -halfSize, y: halfSize, z: halfSize }, // 7: (0,255,255) - cyan
    ];

    // Sortowanie ścian według odległości (painter's algorithm)
    const faces = [
      {
        name: "front",
        corners: [vertices[0], vertices[1], vertices[2], vertices[3]],
        colorFunc: (u: number, v: number) => rgbToColor(u * 255, v * 255, 0),
        avgZ: (vertices[0].z + vertices[1].z + vertices[2].z + vertices[3].z) / 4,
      },
      {
        name: "back",
        corners: [vertices[4], vertices[5], vertices[6], vertices[7]],
        colorFunc: (u: number, v: number) => rgbToColor(u * 255, v * 255, 255),
        avgZ: (vertices[4].z + vertices[5].z + vertices[6].z + vertices[7].z) / 4,
      },
      {
        name: "left",
        corners: [vertices[0], vertices[4], vertices[7], vertices[3]],
        colorFunc: (u: number, v: number) => rgbToColor(0, v * 255, u * 255),
        avgZ: (vertices[0].z + vertices[4].z + vertices[7].z + vertices[3].z) / 4,
      },
      {
        name: "right",
        corners: [vertices[1], vertices[5], vertices[6], vertices[2]],
        colorFunc: (u: number, v: number) => rgbToColor(255, v * 255, u * 255),
        avgZ: (vertices[1].z + vertices[5].z + vertices[6].z + vertices[2].z) / 4,
      },
      {
        name: "top",
        corners: [vertices[3], vertices[2], vertices[6], vertices[7]],
        colorFunc: (u: number, v: number) => rgbToColor(u * 255, 255, v * 255),
        avgZ: (vertices[3].z + vertices[2].z + vertices[6].z + vertices[7].z) / 4,
      },
      {
        name: "bottom",
        corners: [vertices[0], vertices[1], vertices[5], vertices[4]],
        colorFunc: (u: number, v: number) => rgbToColor(u * 255, 0, v * 255),
        avgZ: (vertices[0].z + vertices[1].z + vertices[5].z + vertices[4].z) / 4,
      },
    ];

    const rotatedFaces = faces.map((face) => {
      const cosY = Math.cos((rotationY * Math.PI) / 180);
      const sinY = Math.sin((rotationY * Math.PI) / 180);
      const cosX = Math.cos((rotationX * Math.PI) / 180);
      const sinX = Math.sin((rotationX * Math.PI) / 180);

      const avgZ =
        face.corners.reduce((sum, corner) => {
          const z1 = corner.x * sinY + corner.z * cosY;
          const z2 = corner.y * sinX + z1 * cosX;
          return sum + z2;
        }, 0) / 4;

      return { ...face, avgZ };
    });

    // Sortowanie od najdalszych do najbliższych
    rotatedFaces.sort((a, b) => a.avgZ - b.avgZ);

    // Rysowanie ścian
    rotatedFaces.forEach((face) => {
      drawFace(face.corners, face.colorFunc);
    });

    // Rysowanie przekroju jeśli włączony
    if (showCrossSection) {
      drawCrossSection(ctx, centerX, centerY, size);
    }

    // krawędzie kostki
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1;

    const edges = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [4, 5],
      [5, 6],
      [6, 7],
      [7, 4],
      [0, 4],
      [1, 5],
      [2, 6],
      [3, 7],
    ];

    edges.forEach(([start, end]) => {
      const p1 = project3DTo2D(vertices[start], centerX, centerY);
      const p2 = project3DTo2D(vertices[end], centerX, centerY);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    });
  };

  const drawCrossSection = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) => {
    const halfSize = size / 2;
    const normalizedValue = (crossSectionValue / 255) * size - halfSize;
    const resolution = 30;

    ctx.globalAlpha = 0.8;

    // Rysowanie przekroju
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const u1 = i / resolution;
        const v1 = j / resolution;
        const u2 = (i + 1) / resolution;
        const v2 = (j + 1) / resolution;

        let point1: Point3D, point2: Point3D, point3: Point3D, point4: Point3D;
        let color: string;

        switch (crossSectionAxis) {
          case "x":
            point1 = { x: normalizedValue, y: -halfSize + v1 * size, z: -halfSize + u1 * size };
            point2 = { x: normalizedValue, y: -halfSize + v1 * size, z: -halfSize + u2 * size };
            point3 = { x: normalizedValue, y: -halfSize + v2 * size, z: -halfSize + u2 * size };
            point4 = { x: normalizedValue, y: -halfSize + v2 * size, z: -halfSize + u1 * size };
            color = rgbToColor(crossSectionValue, ((v1 + v2) / 2) * 255, ((u1 + u2) / 2) * 255);
            break;
          case "y":
            point1 = { x: -halfSize + u1 * size, y: normalizedValue, z: -halfSize + v1 * size };
            point2 = { x: -halfSize + u2 * size, y: normalizedValue, z: -halfSize + v1 * size };
            point3 = { x: -halfSize + u2 * size, y: normalizedValue, z: -halfSize + v2 * size };
            point4 = { x: -halfSize + u1 * size, y: normalizedValue, z: -halfSize + v2 * size };
            color = rgbToColor(((u1 + u2) / 2) * 255, crossSectionValue, ((v1 + v2) / 2) * 255);
            break;
          case "z":
            point1 = { x: -halfSize + u1 * size, y: -halfSize + v1 * size, z: normalizedValue };
            point2 = { x: -halfSize + u2 * size, y: -halfSize + v1 * size, z: normalizedValue };
            point3 = { x: -halfSize + u2 * size, y: -halfSize + v2 * size, z: normalizedValue };
            point4 = { x: -halfSize + u1 * size, y: -halfSize + v2 * size, z: normalizedValue };
            color = rgbToColor(((u1 + u2) / 2) * 255, ((v1 + v2) / 2) * 255, crossSectionValue);
            break;
        }

        const p1 = project3DTo2D(point1, centerX, centerY);
        const p2 = project3DTo2D(point2, centerX, centerY);
        const p3 = project3DTo2D(point3, centerX, centerY);
        const p4 = project3DTo2D(point4, centerX, centerY);

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1.0;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMousePos.x;
    const deltaY = e.clientY - lastMousePos.y;

    setRotationY(rotationY + deltaX * 0.5);
    setRotationX(rotationX + deltaY * 0.5);

    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetRotation = () => {
    setRotationX(30);
    setRotationY(45);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Panel kontrolny */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="font-semibold mb-4 text-gray-800">Rotacja</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Oś X: {rotationX.toFixed(0)}°</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotationX}
                  onChange={(e) => setRotationX(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Oś Y: {rotationY.toFixed(0)}°</label>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotationY}
                  onChange={(e) => setRotationY(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <button
                onClick={resetRotation}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} />
                Resetuj rotację
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="font-semibold mb-4 text-gray-800">Rozmiar kostki</h3>
            <div>
              <label className="text-sm font-medium text-gray-700">Wielkość: {cubeSize}px</label>
              <input
                type="range"
                min="100"
                max="300"
                value={cubeSize}
                onChange={(e) => setCubeSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-lg">
            <h3 className="font-semibold mb-4 text-gray-800">Przekrój</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showCrossSection"
                  checked={showCrossSection}
                  onChange={(e) => setShowCrossSection(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="showCrossSection" className="text-sm font-medium text-gray-700">
                  Pokaż przekrój
                </label>
              </div>

              {showCrossSection && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-2">Oś przekroju:</label>
                    <div className="space-y-2">
                      {(["x", "y", "z"] as const).map((axis) => (
                        <label key={axis} className="flex items-center">
                          <input
                            type="radio"
                            name="axis"
                            value={axis}
                            checked={crossSectionAxis === axis}
                            onChange={(e) => setCrossSectionAxis(e.target.value as "x" | "y" | "z")}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">
                            {axis.toUpperCase()} ({axis === "x" ? "Czerwony" : axis === "y" ? "Zielony" : "Niebieski"})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Pozycja: {crossSectionValue}</label>
                    <input
                      type="range"
                      min="0"
                      max="255"
                      value={crossSectionValue}
                      onChange={(e) => setCrossSectionValue(Number(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0</span>
                      <span>128</span>
                      <span>255</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-800 text-lg">Wizualizacja kostki RGB</h3>
              <p className="text-sm text-gray-600 mt-1">
                Przeciągnij myszką, aby obrócić kostkę. Użyj panelu po lewej do precyzyjnej kontroli.
              </p>
            </div>
            <canvas
              ref={canvasRef}
              width={800}
              height={500}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              className="border-2 border-gray-300 rounded-lg cursor-move bg-gradient-to-br from-gray-50 to-gray-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cube;
