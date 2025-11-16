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
  const [jpegQuality, setJpegQuality] = useState(90);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [bezierDegree, setBezierDegree] = useState(3);
  const [bezierPoints, setBezierPoints] = useState<string[]>([]);

  const [draggedShape, setDraggedShape] = useState<string | null>(null);
  const [draggedHandle, setDraggedHandle] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);

  const [formParams, setFormParams] = useState({
    x1: "",
    y1: "",
    x2: "",
    y2: "",
  });

  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    shapes.forEach((shape) => {
      drawShape(ctx, shape);

      if (shape.selected && (currentTool === "resize" || currentTool === "select")) {
        drawHandles(ctx, shape);
      }
    });

    if (isDrawing && drawingPoints.length > 0) {
      if (currentShape === "bezier") {
        // Dla krzywej Béziera rysuj tylko punkty podczas tworzenia
        ctx.fillStyle = currentColor;
        drawingPoints.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
          ctx.fill();
        });

        // Rysuj linie pomocnicze między punktami
        if (drawingPoints.length > 1) {
          ctx.save();
          ctx.strokeStyle = "#aaaaaa";
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
          for (let i = 1; i < drawingPoints.length; i++) {
            ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      } else {
        const tempShape: Partial<AnyShape> = {
          type: currentShape,
          color: currentColor,
          lineWidth: currentLineWidth,
          points: drawingPoints as [Point, Point],
          selected: false,
          id: "temp",
        };
        drawShape(ctx, tempShape as AnyShape, true);
      }
    }
  }, [shapes, isDrawing, drawingPoints, currentTool, currentShape, currentColor, currentLineWidth]);

  const drawBezierCurve = (ctx: CanvasRenderingContext2D, points: Point[], showControlLines = false) => {
    if (points.length < 2) return;

    // Rysuj linie kontrolne i punkty kontrolne
    if (showControlLines) {
      ctx.save();
      ctx.strokeStyle = "#aaaaaa";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Punkty kontrolne
      ctx.fillStyle = "#666666";
      points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    // Rysuj krzywą Béziera
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    const steps = 100;
    for (let t = 0; t <= steps; t++) {
      const u = t / steps;
      const pt = calculateBezierPoint(points, u);
      ctx.lineTo(pt.x, pt.y);
    }
    ctx.stroke();
  };

  const calculateBezierPoint = (points: Point[], t: number): Point => {
    const n = points.length - 1;
    let x = 0;
    let y = 0;

    for (let i = 0; i <= n; i++) {
      const coeff = binomialCoefficient(n, i) * Math.pow(1 - t, n - i) * Math.pow(t, i);
      x += coeff * points[i].x;
      y += coeff * points[i].y;
    }

    return { x, y };
  };

  const binomialCoefficient = (n: number, k: number): number => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;

    let result = 1;
    for (let i = 1; i <= k; i++) {
      result *= (n - i + 1) / i;
    }
    return result;
  };

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

      case "bezier":
        if (shape.points.length >= 2) {
          drawBezierCurve(ctx, shape.points, shape.selected && !isTemp);
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
        return isPointNearLine(point, shape, tolerance);

      case "rectangle": {
        return isPointNearRectangle(point, shape, tolerance);
      }

      case "circle": {
        return isPointNearCircle(point, shape, tolerance);
      }

      case "bezier": {
        return isPointNearBezier(point, shape, tolerance);
      }
    }
  };

  const isPointNearLine = (point: Point, shape: AnyShape, tolerance: number): boolean => {
    const start = shape.points[0];
    const end = shape.points[1];
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

  const isPointNearRectangle = (point: Point, shape: AnyShape, tolerance: number): boolean => {
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
  };

  const isPointNearCircle = (point: Point, shape: AnyShape, tolerance: number): boolean => {
    const radius = Math.sqrt(
      Math.pow(shape.points[1].x - shape.points[0].x, 2) + Math.pow(shape.points[1].y - shape.points[0].y, 2)
    );
    const dist = Math.sqrt(Math.pow(point.x - shape.points[0].x, 2) + Math.pow(point.y - shape.points[0].y, 2));
    return Math.abs(dist - radius) <= tolerance;
  };

  const isPointNearBezier = (point: Point, shape: AnyShape, tolerance: number): boolean => {
    const steps = 100;
    for (let t = 0; t <= steps; t++) {
      const u = t / steps;
      const pt = calculateBezierPoint(shape.points, u);
      const distance = Math.sqrt(Math.pow(point.x - pt.x, 2) + Math.pow(point.y - pt.y, 2));
      if (distance <= tolerance) return true;
    }
    return false;
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
      if (currentShape === "bezier") {
        setIsDrawing(true);
        setDrawingPoints([...drawingPoints, point]);
      } else {
        setIsDrawing(true);
        setDrawingPoints([point]);
      }
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
      if (currentShape === "bezier") {
        // Dla Béziera aktualizuj pozycję ostatniego punktu bez dodawania go do tablicy
      } else if (currentShape === "line" || currentShape === "rectangle" || currentShape === "circle") {
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
              points: shape.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) as [Point, Point],
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
            return { ...shape, points: newPoints as [Point, Point] };
          }
          return shape;
        })
      );
    }
  };

  const handleMouseUp = () => {
    if (currentTool === "draw" && isDrawing) {
      if (currentShape === "bezier") {
        // Nie kończymy - czekamy na przycisk "Zakończ krzywą"
      } else if (drawingPoints.length === 2) {
        const newShape: AnyShape = {
          id: Date.now().toString(),
          type: currentShape,
          color: currentColor,
          lineWidth: currentLineWidth,
          points: drawingPoints as [Point, Point],
          selected: false,
        };
        setShapes([...shapes, newShape]);
        setIsDrawing(false);
        setDrawingPoints([]);
      }
    } else if (currentTool === "move" || currentTool === "resize") {
      setDraggedShape(null);
      setDraggedHandle(null);
      setDragStart(null);
    }
  };

  const handleAddShapeFromForm = () => {
    if (currentShape === "bezier") {
      handleAddBezierFromForm();
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

    const newShape: AnyShape = {
      id: Date.now().toString(),
      type: currentShape,
      color: currentColor,
      lineWidth: currentLineWidth,
      points: [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ] as [Point, Point],
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

    const selectedShape = shapes.find((s) => s.id === selectedShapeId);
    if (selectedShape?.type === "bezier") {
      handleUpdateBezierFromForm();
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
            ] as [Point, Point],
          };
        }
        return shape;
      })
    );
  };

  const updateFormFromShape = (shape: AnyShape) => {
    if (shape.type === "bezier") {
      const pointStrings = shape.points.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`);
      setBezierPoints(pointStrings);
    } else if (shape.points.length >= 2) {
      setFormParams({
        x1: shape.points[0].x.toFixed(0),
        y1: shape.points[0].y.toFixed(0),
        x2: shape.points[1].x.toFixed(0),
        y2: shape.points[1].y.toFixed(0),
      });
    }
  };

  const handleFinishBezier = () => {
    if (drawingPoints.length >= 2) {
      const newShape: AnyShape = {
        id: Date.now().toString(),
        type: "bezier",
        color: currentColor,
        lineWidth: currentLineWidth,
        points: drawingPoints,
        selected: false,
      };
      setShapes([...shapes, newShape]);
      setIsDrawing(false);
      setDrawingPoints([]);
    }
  };

  const handleCancelBezier = () => {
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  const handleAddBezierFromForm = () => {
    const points: Point[] = [];
    for (const pointStr of bezierPoints) {
      const [xStr, yStr] = pointStr.split(",");
      const x = parseFloat(xStr);
      const y = parseFloat(yStr);
      if (isNaN(x) || isNaN(y)) {
        alert("Proszę podać poprawne wartości liczbowe (format: x,y)");
        return;
      }
      points.push({ x, y });
    }

    if (points.length < 2) {
      alert("Krzywa Béziera wymaga co najmniej 2 punktów");
      return;
    }

    const newShape: AnyShape = {
      id: Date.now().toString(),
      type: "bezier",
      color: currentColor,
      lineWidth: currentLineWidth,
      points,
      selected: false,
    };

    setShapes([...shapes, newShape]);
    setBezierPoints([]);
  };

  const handleUpdateBezierFromForm = () => {
    const points: Point[] = [];
    for (const pointStr of bezierPoints) {
      const [xStr, yStr] = pointStr.split(",");
      const x = parseFloat(xStr);
      const y = parseFloat(yStr);
      if (isNaN(x) || isNaN(y)) {
        alert("Proszę podać poprawne wartości liczbowe (format: x,y)");
        return;
      }
      points.push({ x, y });
    }

    if (points.length < 2) {
      alert("Krzywa Béziera wymaga co najmniej 2 punktów");
      return;
    }

    setShapes(
      shapes.map((shape) => {
        if (shape.id === selectedShapeId && shape.type === "bezier") {
          return { ...shape, points };
        }
        return shape;
      })
    );
  };

  const initializeBezierPoints = () => {
    const numPoints = bezierDegree + 1;
    const newPoints: string[] = [];
    for (let i = 0; i < numPoints; i++) {
      newPoints.push("");
    }
    setBezierPoints(newPoints);
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

  const handleSaveJPEG = () => {
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
            {(["line", "rectangle", "circle", "bezier"] as ShapeType[]).map((shape) => (
              <button
                key={shape}
                onClick={() => setCurrentShape(shape)}
                className={`w-full px-3 py-2 rounded text-sm font-medium transition ${
                  currentShape === shape ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {shape === "line"
                  ? "Linia"
                  : shape === "rectangle"
                  ? "Prostokąt"
                  : shape === "circle"
                  ? "Okrąg"
                  : "Krzywa Béziera"}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Grubość linii: {currentLineWidth}</label>
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
          {currentShape === "bezier" ||
          (selectedShapeId && shapes.find((s) => s.id === selectedShapeId)?.type === "bezier") ? (
            <div className="space-y-2">
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Stopień krzywej: {bezierDegree}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={bezierDegree}
                  onChange={(e) => setBezierDegree(parseInt(e.target.value))}
                  className="w-full"
                />
                <button
                  onClick={initializeBezierPoints}
                  className="w-full mt-2 px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                >
                  Ustaw {bezierDegree + 1} punktów
                </button>
              </div>
              {bezierPoints.map((point, idx) => (
                <input
                  key={idx}
                  type="text"
                  placeholder={`Punkt ${idx + 1} (x,y)`}
                  value={point}
                  onChange={(e) => {
                    const newPoints = [...bezierPoints];
                    newPoints[idx] = e.target.value;
                    setBezierPoints(newPoints);
                  }}
                  className="w-full px-2 py-1 border rounded text-sm"
                />
              ))}
              <button
                onClick={handleAddBezierFromForm}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                Dodaj krzywą
              </button>
              {selectedShapeId && shapes.find((s) => s.id === selectedShapeId)?.type === "bezier" && (
                <button
                  onClick={handleUpdateBezierFromForm}
                  className="w-full px-3 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm font-medium"
                >
                  Zaktualizuj krzywą
                </button>
              )}
            </div>
          ) : (
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
          )}
        </div>

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
        <div className="bg-white p-4 rounded-lg shadow sticky top-3">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-700">Kanwa</h3>
            <p className="text-sm text-gray-600">Obiektów: {shapes.length}</p>
          </div>
          <canvas
            ref={canvasRef}
            width={880}
            height={600}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="border-2 border-gray-300 rounded cursor-crosshair bg-white"
          />
          {isDrawing && currentShape === "bezier" && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleFinishBezier}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
              >
                Zakończ krzywą ({drawingPoints.length} punktów)
              </button>
              <button
                onClick={handleCancelBezier}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
              >
                Anuluj
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Task1Primitives;
