import React, { useState, useRef, useEffect } from "react";
import { Download, Upload, Trash2 } from "lucide-react";
import type { AnyShape, Point, ShapeType, Tool } from "../types/types";

const Task1Primitives = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [shapes, setShapes] = useState<AnyShape[]>([]);
  const [currentTool, setCurrentTool] = useState<Tool>("draw");
  const [currentShape, setCurrentShape] = useState<ShapeType>("line");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentLineWidth, setCurrentLineWidth] = useState(2);

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);

  const [draggedShape, setDraggedShape] = useState<string | null>(null);
  const [draggedHandle, setDraggedHandle] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  // Parametry z formularza
  const [formParams, setFormParams] = useState({
    x1: "",
    y1: "",
    x2: "",
    y2: "",
  });

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // Rysowanie na canvasie
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Czyszczenie canvasu
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rysowanie wszystkich kształtów
    shapes.forEach((shape) => {
      drawShape(ctx, shape);

      // Rysowanie punktów chwytów dla zaznaczonych obiektów
      if (shape.selected && (currentTool === "resize" || currentTool === "select")) {
        drawHandles(ctx, shape);
      }
    });

    // Rysowanie kształtu w trakcie tworzenia
    if (isDrawing && drawingPoints.length > 0) {
      const tempShape: Partial<AnyShape> = {
        type: currentShape,
        color: currentColor,
        lineWidth: currentLineWidth,
        points: drawingPoints as any,
        selected: false,
        id: "temp",
      };
      drawShape(ctx, tempShape as AnyShape, true);
    }
  }, [shapes, isDrawing, drawingPoints, currentTool, currentShape, currentColor, currentLineWidth]);

  const drawShape = (ctx: CanvasRenderingContext2D, shape: AnyShape, isTemp = false) => {
    ctx.strokeStyle = shape.color;
    ctx.lineWidth = shape.lineWidth;
    ctx.fillStyle = shape.color;

    if (shape.selected && !isTemp) {
      ctx.strokeStyle = "#0066ff";
      ctx.lineWidth = shape.lineWidth + 1;
    }

    switch (shape.type) {
      case "line":
        if (shape.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          ctx.lineTo(shape.points[1].x, shape.points[1].y);
          ctx.stroke();
        }
        break;

      case "rectangle":
        if (shape.points.length >= 2) {
          const width = shape.points[1].x - shape.points[0].x;
          const height = shape.points[1].y - shape.points[0].y;
          ctx.strokeRect(shape.points[0].x, shape.points[0].y, width, height);
        }
        break;

      case "circle":
        if (shape.points.length >= 2) {
          const radius = Math.sqrt(
            Math.pow(shape.points[1].x - shape.points[0].x, 2) + Math.pow(shape.points[1].y - shape.points[0].y, 2)
          );
          ctx.beginPath();
          ctx.arc(shape.points[0].x, shape.points[0].y, radius, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;
    }
  };

  const drawHandles = (ctx: CanvasRenderingContext2D, shape: AnyShape) => {
    ctx.fillStyle = "#0066ff";
    shape.points.forEach((point) => {
      ctx.fillRect(point.x - 4, point.y - 4, 8, 8);
    });
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const findShapeAtPoint = (point: Point): AnyShape | null => {
    // Szukamy od końca (najnowsze na wierzchu)
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (isPointOnShape(point, shape)) {
        return shape;
      }
    }
    return null;
  };

  const isPointOnShape = (point: Point, shape: AnyShape): boolean => {
    const tolerance = 5;

    switch (shape.type) {
      case "line":
        return isPointNearLine(point, shape.points[0], shape.points[1], tolerance);

      case "rectangle": {
        const x = Math.min(shape.points[0].x, shape.points[1].x);
        const y = Math.min(shape.points[0].y, shape.points[1].y);
        const width = Math.abs(shape.points[1].x - shape.points[0].x);
        const height = Math.abs(shape.points[1].y - shape.points[0].y);
        return (
          point.x >= x - tolerance &&
          point.x <= x + width + tolerance &&
          point.y >= y - tolerance &&
          point.y <= y + height + tolerance
        );
      }

      case "circle": {
        const radius = Math.sqrt(
          Math.pow(shape.points[1].x - shape.points[0].x, 2) + Math.pow(shape.points[1].y - shape.points[0].y, 2)
        );
        const dist = Math.sqrt(Math.pow(point.x - shape.points[0].x, 2) + Math.pow(point.y - shape.points[0].y, 2));
        return Math.abs(dist - radius) <= tolerance;
      }
    }
  };

  const isPointNearLine = (point: Point, start: Point, end: Point, tolerance: number): boolean => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return false;

    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / (length * length)));
    const projX = start.x + t * dx;
    const projY = start.y + t * dy;
    const distance = Math.sqrt(Math.pow(point.x - projX, 2) + Math.pow(point.y - projY, 2));

    return distance <= tolerance;
  };

  const findHandleAtPoint = (shape: AnyShape, point: Point): number | null => {
    const handleSize = 8;
    for (let i = 0; i < shape.points.length; i++) {
      const p = shape.points[i];
      if (Math.abs(point.x - p.x) <= handleSize && Math.abs(point.y - p.y) <= handleSize) {
        return i;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);

    if (currentTool === "draw") {
      setIsDrawing(true);
      setDrawingPoints([point]);
    } else if (currentTool === "select") {
      const shape = findShapeAtPoint(point);
      if (shape) {
        setShapes(shapes.map((s) => ({ ...s, selected: s.id === shape.id })));
        setSelectedShapeId(shape.id);
        updateFormFromShape(shape);
      } else {
        setShapes(shapes.map((s) => ({ ...s, selected: false })));
        setSelectedShapeId(null);
      }
    } else if (currentTool === "move") {
      const shape = findShapeAtPoint(point);
      if (shape) {
        setDraggedShape(shape.id);
        setDragStart(point);
      }
    } else if (currentTool === "resize") {
      const selectedShape = shapes.find((s) => s.selected);
      if (selectedShape) {
        const handleIdx = findHandleAtPoint(selectedShape, point);
        if (handleIdx !== null) {
          setDraggedShape(selectedShape.id);
          setDraggedHandle(handleIdx);
          setDragStart(point);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);

    if (currentTool === "draw" && isDrawing) {
      if (currentShape === "line" || currentShape === "rectangle" || currentShape === "circle") {
        setDrawingPoints([drawingPoints[0], point]);
      }
    } else if (currentTool === "move" && draggedShape && dragStart) {
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;

      setShapes(
        shapes.map((shape) => {
          if (shape.id === draggedShape) {
            return {
              ...shape,
              points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) as any,
            };
          }
          return shape;
        })
      );

      setDragStart(point);
    } else if (currentTool === "resize" && draggedShape && draggedHandle !== null) {
      setShapes(
        shapes.map((shape) => {
          if (shape.id === draggedShape) {
            const newPoints = [...shape.points];
            newPoints[draggedHandle] = point;
            return { ...shape, points: newPoints as any };
          }
          return shape;
        })
      );
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === "draw" && isDrawing && drawingPoints.length === 2) {
      const newShape: AnyShape = {
        id: Date.now().toString(),
        type: currentShape,
        color: currentColor,
        lineWidth: currentLineWidth,
        points: drawingPoints as any,
        selected: false,
      };
      setShapes([...shapes, newShape]);
      setIsDrawing(false);
      setDrawingPoints([]);
    } else if (currentTool === "move" || currentTool === "resize") {
      setDraggedShape(null);
      setDraggedHandle(null);
      setDragStart(null);
    }
  };

  const handleAddShapeFromForm = () => {
    const x1 = parseFloat(formParams.x1);
    const y1 = parseFloat(formParams.y1);
    const x2 = parseFloat(formParams.x2);
    const y2 = parseFloat(formParams.y2);

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      alert("Proszę podać poprawne wartości liczbowe");
      return;
    }

    const newShape: AnyShape = {
      id: Date.now().toString(),
      type: currentShape,
      color: currentColor,
      lineWidth: currentLineWidth,
      points: [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ] as any,
      selected: false,
    };

    setShapes([...shapes, newShape]);
    setFormParams({ x1: "", y1: "", x2: "", y2: "" });
  };

  const handleUpdateShapeFromForm = () => {
    if (!selectedShapeId) {
      alert("Proszę najpierw zaznaczyć obiekt");
      return;
    }

    const x1 = parseFloat(formParams.x1);
    const y1 = parseFloat(formParams.y1);
    const x2 = parseFloat(formParams.x2);
    const y2 = parseFloat(formParams.y2);

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      alert("Proszę podać poprawne wartości liczbowe");
      return;
    }

    setShapes(
      shapes.map((shape) => {
        if (shape.id === selectedShapeId) {
          return {
            ...shape,
            points: [
              { x: x1, y: y1 },
              { x: x2, y: y2 },
            ] as any,
          };
        }
        return shape;
      })
    );
  };

  const updateFormFromShape = (shape: AnyShape) => {
    if (shape.points.length >= 2) {
      setFormParams({
        x1: shape.points[0].x.toFixed(0),
        y1: shape.points[0].y.toFixed(0),
        x2: shape.points[1].x.toFixed(0),
        y2: shape.points[1].y.toFixed(0),
      });
    }
  };

  const handleClearCanvas = () => {
    if (confirm("Czy na pewno chcesz wyczyścić całą kanwę?")) {
      setShapes([]);
      setSelectedShapeId(null);
    }
  };

  const handleSaveToFile = () => {
    const data = JSON.stringify(shapes, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shapes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadFromFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setShapes(data);
      } catch {
        alert("Błąd wczytywania pliku");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3 text-gray-700">Narzędzie</h3>
            <div className="space-y-2">
              {(["draw", "select", "move", "resize"] as Tool[]).map((tool) => (
                <button
                  key={tool}
                  onClick={() => setCurrentTool(tool)}
                  className={`w-full px-3 py-2 rounded text-sm font-medium transition ${
                    currentTool === tool ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {tool === "draw"
                    ? "Rysuj"
                    : tool === "select"
                    ? "Zaznacz"
                    : tool === "move"
                    ? "Przesuń"
                    : "Zmień rozmiar"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3 text-gray-700">Typ kształtu</h3>
            <div className="space-y-2">
              {(["line", "rectangle", "circle"] as ShapeType[]).map((shape) => (
                <button
                  key={shape}
                  onClick={() => setCurrentShape(shape)}
                  className={`w-full px-3 py-2 rounded text-sm font-medium transition ${
                    currentShape === shape ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {shape === "line" ? "Linia" : shape === "rectangle" ? "Prostokąt" : "Okrąg"}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3 text-gray-700">Parametry</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kolor</label>
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => setCurrentColor(e.target.value)}
                  className="w-full h-10 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grubość linii: {currentLineWidth}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentLineWidth}
                  onChange={(e) => setCurrentLineWidth(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold mb-3 text-gray-700">Współrzędne</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="X1"
                  value={formParams.x1}
                  onChange={(e) => setFormParams({ ...formParams, x1: e.target.value })}
                  className="px-2 py-1 border rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Y1"
                  value={formParams.y1}
                  onChange={(e) => setFormParams({ ...formParams, y1: e.target.value })}
                  className="px-2 py-1 border rounded text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="X2"
                  value={formParams.x2}
                  onChange={(e) => setFormParams({ ...formParams, x2: e.target.value })}
                  className="px-2 py-1 border rounded text-sm"
                />
                <input
                  type="number"
                  placeholder="Y2"
                  value={formParams.y2}
                  onChange={(e) => setFormParams({ ...formParams, y2: e.target.value })}
                  className="px-2 py-1 border rounded text-sm"
                />
              </div>
              <button
                onClick={handleAddShapeFromForm}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Dodaj kształt
              </button>
              {selectedShapeId && (
                <button
                  onClick={handleUpdateShapeFromForm}
                  className="w-full px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm font-medium"
                >
                  Zaktualizuj zaznaczony
                </button>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow space-y-2">
            <button
              onClick={handleSaveToFile}
              className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Download size={16} />
              Zapisz do pliku
            </button>
            <label className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center justify-center gap-2 cursor-pointer text-sm font-medium">
              <Upload size={16} />
              Wczytaj z pliku
              <input type="file" accept=".json" onChange={handleLoadFromFile} className="hidden" />
            </label>
            <button
              onClick={handleClearCanvas}
              className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center justify-center gap-2 text-sm font-medium"
            >
              <Trash2 size={16} />
              Wyczyść kanwę
            </button>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="mb-4">
              <h3 className="font-semibold text-gray-700">Kanwa</h3>
              <p className="text-sm text-gray-600">Obiektów: {shapes.length}</p>
            </div>
            <canvas
              ref={canvasRef}
              width={900}
              height={600}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="border-2 border-gray-300 rounded cursor-crosshair bg-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Task1Primitives;
