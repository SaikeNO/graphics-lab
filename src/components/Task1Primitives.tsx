import React, { useState, useRef, useEffect } from "react";
import { Download, Upload, Trash2, RefreshCw, Maximize } from "lucide-react";
import type { AnyShape, Point, ShapeType, Tool } from "../types/types";
import {
  applyMatrixToPoint,
  calculateBezierPoint,
  createTranslationMatrix,
  getRotationAroundPointMatrix,
  getScaleAroundPointMatrix,
} from "../utils/matrix";
import { findHandleAtPoint, getShapeCenter, isPointOnShape } from "../utils/geometry";
import { handleLoadFromFile, handleSaveJPEG, handleSaveToFile } from "../utils/file";

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
  const [polygonInput, setPolygonInput] = useState("");
  const [draggedShape, setDraggedShape] = useState<string | null>(null);
  const [draggedHandle, setDraggedHandle] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [pivotPoint, setPivotPoint] = useState<Point | null>(null);
  const [initialAngle, setInitialAngle] = useState<number>(0);
  const [initialScaleDist, setInitialScaleDist] = useState<number>(0);
  const [transVector, setTransVector] = useState({ x: 0, y: 0 });
  const [rotParams, setRotParams] = useState({ angle: 45 });
  const [scaleParams, setScaleParams] = useState({ factor: 1.5 });
  const [manualPivot, setManualPivot] = useState({ x: 0, y: 0 });
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
      if (shape.selected) {
        if (currentTool === "resize" || currentTool === "select") {
          drawHandles(ctx, shape);
        }
        if ((currentTool === "rotate" || currentTool === "scale") && pivotPoint && shape.id === selectedShapeId) {
          drawPivot(ctx, pivotPoint);
        }
      }
    });

    if (isDrawing && drawingPoints.length > 0) {
      if (currentShape === "bezier") {
        drawBezierPreview(ctx);
      } else if (currentShape === "polygon") {
        drawPolygonPreview(ctx);
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
  }, [
    shapes,
    isDrawing,
    drawingPoints,
    currentTool,
    currentShape,
    currentColor,
    currentLineWidth,
    pivotPoint,
    selectedShapeId,
  ]);

  const drawPivot = (ctx: CanvasRenderingContext2D, p: Point) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(255, 0, 255, 0.5)";
    ctx.fill();
    ctx.strokeStyle = "magenta";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x - 10, p.y);
    ctx.lineTo(p.x + 10, p.y);
    ctx.moveTo(p.x, p.y - 10);
    ctx.lineTo(p.x, p.y + 10);
    ctx.stroke();
  };

  const drawBezierPreview = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = currentColor;
    drawingPoints.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
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
      ctx.restore();
    }
  };

  const drawPolygonPreview = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentLineWidth;
    ctx.beginPath();
    if (drawingPoints.length > 0) {
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
      }
    }
    ctx.stroke();
    ctx.fillStyle = currentColor;
    drawingPoints.forEach((p) => {
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    });
  };

  const drawBezierCurve = (ctx: CanvasRenderingContext2D, points: Point[], showControlLines = false) => {
    if (points.length < 2) return;

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

      ctx.fillStyle = "#666666";
      points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

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
      case "polygon":
        if (shape.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
          }
          ctx.closePath();
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
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (isPointOnShape(point, shape)) {
        return shape;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);

    if (e.ctrlKey && (currentTool === "rotate" || currentTool === "scale")) {
      setPivotPoint(point);
      setManualPivot({ x: point.x, y: point.y });
      return;
    }

    if (currentTool === "draw") {
      if (currentShape === "bezier" || currentShape === "polygon") {
        setIsDrawing(true);
        if (currentShape === "polygon" && drawingPoints.length > 2) {
          const startPoint = drawingPoints[0];
          const dist = Math.sqrt(Math.pow(point.x - startPoint.x, 2) + Math.pow(point.y - startPoint.y, 2));
          if (dist < 10) {
            handleFinishPolygon();
            return;
          }
        }
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
        const center = getShapeCenter(shape);
        setPivotPoint(center);
        setManualPivot(center);
      } else {
        setShapes(shapes.map((s) => ({ ...s, selected: false })));
        setSelectedShapeId(null);
        setPivotPoint(null);
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
    } else if (currentTool === "rotate") {
      const selectedShape = shapes.find((s) => s.selected);
      if (selectedShape && pivotPoint) {
        setDraggedShape(selectedShape.id);
        setDragStart(point);
        setInitialAngle(Math.atan2(point.y - pivotPoint.y, point.x - pivotPoint.x));
      }
    } else if (currentTool === "scale") {
      const selectedShape = shapes.find((s) => s.selected);
      if (selectedShape && pivotPoint) {
        setDraggedShape(selectedShape.id);
        setDragStart(point);
        setInitialScaleDist(Math.sqrt(Math.pow(point.x - pivotPoint.x, 2) + Math.pow(point.y - pivotPoint.y, 2)));
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getMousePos(e);

    if (currentTool === "draw" && isDrawing) {
      if (currentShape === "bezier" || currentShape === "polygon") {
        // visual feedback handled in render
      } else if (currentShape === "line" || currentShape === "rectangle" || currentShape === "circle") {
        setDrawingPoints([drawingPoints[0], point]);
      }
    } else if (currentTool === "move" && draggedShape && dragStart) {
      const dx = point.x - dragStart.x;
      const dy = point.y - dragStart.y;
      const T = createTranslationMatrix(dx, dy);

      setShapes(
        shapes.map((shape) => {
          if (shape.id === draggedShape) {
            const newPoints = shape.points.map((p) => applyMatrixToPoint(T, p));
            return { ...shape, points: newPoints as [Point, Point] };
          }
          return shape;
        })
      );
      setDragStart(point);
      if (pivotPoint) setPivotPoint({ x: pivotPoint.x + dx, y: pivotPoint.y + dy });
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
    } else if (currentTool === "rotate" && draggedShape && pivotPoint) {
      const currentAngle = Math.atan2(point.y - pivotPoint.y, point.x - pivotPoint.x);
      const deltaAngle = currentAngle - initialAngle;
      const deltaDeg = deltaAngle * (180 / Math.PI);
      const M = getRotationAroundPointMatrix(deltaDeg, pivotPoint.x, pivotPoint.y);

      setShapes(
        shapes.map((shape) => {
          if (shape.id === draggedShape) {
            const newPoints = shape.points.map((p) => applyMatrixToPoint(M, p));
            return { ...shape, points: newPoints as [Point, Point] };
          }
          return shape;
        })
      );
      setInitialAngle(currentAngle);
    } else if (currentTool === "scale" && draggedShape && pivotPoint) {
      const currentDist = Math.sqrt(Math.pow(point.x - pivotPoint.x, 2) + Math.pow(point.y - pivotPoint.y, 2));
      if (initialScaleDist === 0) return;
      const scaleFactor = currentDist / initialScaleDist;
      if (Math.abs(scaleFactor - 1) < 0.01) return;
      const M = getScaleAroundPointMatrix(scaleFactor, pivotPoint.x, pivotPoint.y);

      setShapes(
        shapes.map((shape) => {
          if (shape.id === draggedShape) {
            const newPoints = shape.points.map((p) => applyMatrixToPoint(M, p));
            return { ...shape, points: newPoints as [Point, Point] };
          }
          return shape;
        })
      );
      setInitialScaleDist(currentDist);
    }
  };

  const handleMouseUp = () => {
    if (currentTool === "draw" && isDrawing) {
      if (currentShape === "bezier" || currentShape === "polygon") {
        // Czekamy na jawne zakończenie
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
    } else {
      setDraggedShape(null);
      setDraggedHandle(null);
      setDragStart(null);
    }
  };

  const handleFinishPolygon = () => {
    if (drawingPoints.length < 3) {
      alert("Wielokąt musi mieć przynajmniej 3 punkty");
      return;
    }
    const newShape: AnyShape = {
      id: Date.now().toString(),
      type: "polygon",
      color: currentColor,
      lineWidth: currentLineWidth,
      points: drawingPoints,
      selected: false,
    };
    setShapes([...shapes, newShape]);
    setIsDrawing(false);
    setDrawingPoints([]);
  };

  const handleAddPolygonFromText = () => {
    const pointsStr = polygonInput.split(";");
    const points: Point[] = [];
    for (const p of pointsStr) {
      const [x, y] = p.trim().split(",").map(Number);
      if (!isNaN(x) && !isNaN(y)) points.push({ x, y });
    }
    if (points.length < 3) {
      alert("Podaj przynajmniej 3 punkty w formacie x,y; x,y; x,y");
      return;
    }
    const newShape: AnyShape = {
      id: Date.now().toString(),
      type: "polygon",
      color: currentColor,
      lineWidth: currentLineWidth,
      points: points,
      selected: false,
    };
    setShapes([...shapes, newShape]);
    setPolygonInput("");
  };

  const updateFormFromShape = (shape: AnyShape) => {
    if (shape.type === "bezier") {
      const pointStrings = shape.points.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`);
      setBezierPoints(pointStrings);
    } else if (shape.type === "polygon") {
      const str = shape.points.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join("; ");
      setPolygonInput(str);
    } else if (shape.points.length >= 2) {
      setFormParams({
        x1: shape.points[0].x.toFixed(0),
        y1: shape.points[0].y.toFixed(0),
        x2: shape.points[1].x.toFixed(0),
        y2: shape.points[1].y.toFixed(0),
      });
    }
  };

  const applyManualTranslate = () => {
    if (!selectedShapeId) return;
    const T = createTranslationMatrix(transVector.x, transVector.y);
    setShapes(
      shapes.map((s) => {
        if (s.id === selectedShapeId) {
          return { ...s, points: s.points.map((p) => applyMatrixToPoint(T, p)) as [Point, Point] };
        }
        return s;
      })
    );
    if (pivotPoint) setPivotPoint({ x: pivotPoint.x + transVector.x, y: pivotPoint.y + transVector.y });
  };

  const applyManualRotate = () => {
    if (!selectedShapeId) return;
    const M = getRotationAroundPointMatrix(rotParams.angle, manualPivot.x, manualPivot.y);
    setShapes(
      shapes.map((s) => {
        if (s.id === selectedShapeId) {
          return { ...s, points: s.points.map((p) => applyMatrixToPoint(M, p)) as [Point, Point] };
        }
        return s;
      })
    );
  };

  const applyManualScale = () => {
    if (!selectedShapeId) return;
    const M = getScaleAroundPointMatrix(scaleParams.factor, manualPivot.x, manualPivot.y);
    setShapes(
      shapes.map((s) => {
        if (s.id === selectedShapeId) {
          return { ...s, points: s.points.map((p) => applyMatrixToPoint(M, p)) as [Point, Point] };
        }
        return s;
      })
    );
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

  const handleAddShapeFromForm = () => {
    if (currentShape === "bezier") {
      handleAddBezierFromForm();
      return;
    }
    if (currentShape === "polygon") {
      handleAddPolygonFromText();
      return;
    }
    const x1 = parseFloat(formParams.x1);
    const y1 = parseFloat(formParams.y1);
    const x2 = parseFloat(formParams.x2);
    const y2 = parseFloat(formParams.y2);
    if (isNaN(x1) || isNaN(y1)) return;
    setShapes([
      ...shapes,
      {
        id: Date.now().toString(),
        type: currentShape as ShapeType,
        color: currentColor,
        lineWidth: currentLineWidth,
        points: [
          { x: x1, y: y1 },
          { x: x2, y: y2 },
        ] as [Point, Point],
        selected: false,
      },
    ]);
  };

  const handleUpdateShapeFromForm = () => {
    if (!selectedShapeId) return;
    const x1 = parseFloat(formParams.x1);
    const y1 = parseFloat(formParams.y1);
    const x2 = parseFloat(formParams.x2);
    const y2 = parseFloat(formParams.y2);
    setShapes(
      shapes.map((s) => {
        if (s.id === selectedShapeId && s.type !== "bezier" && s.type !== "polygon") {
          return {
            ...s,
            points: [
              { x: x1, y: y1 },
              { x: x2, y: y2 },
            ] as [Point, Point],
          };
        }
        return s;
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
      setPivotPoint(null);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-1 space-y-4">
        {/* Narzędzia */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-gray-700">Narzędzie</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCurrentTool("draw")}
                className={`px-2 py-2 rounded text-sm ${
                  currentTool === "draw" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Rysuj
              </button>
              <button
                onClick={() => setCurrentTool("select")}
                className={`px-2 py-2 rounded text-sm ${
                  currentTool === "select" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Zaznacz
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCurrentTool("move")}
                className={`px-2 py-2 rounded text-sm ${
                  currentTool === "move" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Przesuń
              </button>
              <button
                onClick={() => setCurrentTool("resize")}
                className={`px-2 py-2 rounded text-sm ${
                  currentTool === "resize" ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                Zmień rozm.
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setCurrentTool("rotate")}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded text-sm ${
                  currentTool === "rotate" ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-900"
                }`}
              >
                <RefreshCw size={14} /> Obróć
              </button>
              <button
                onClick={() => setCurrentTool("scale")}
                className={`flex items-center justify-center gap-1 px-2 py-2 rounded text-sm ${
                  currentTool === "scale" ? "bg-purple-600 text-white" : "bg-purple-100 text-purple-900"
                }`}
              >
                <Maximize size={14} /> Skaluj
              </button>
            </div>
            <div className="text-xs text-gray-500 italic mt-1">
              W trybie Obróć/Skaluj: <b>Ctrl+Klik</b> ustawia punkt odniesienia.
            </div>
          </div>
        </div>

        {/* Kształty */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-gray-700">Typ kształtu</h3>
          <div className="grid grid-cols-2 gap-2">
            {(["line", "rectangle", "circle", "bezier", "polygon"] as ShapeType[]).map((shape) => (
              <button
                key={shape}
                onClick={() => setCurrentShape(shape)}
                className={`px-2 py-2 rounded text-sm font-medium transition ${
                  currentShape === shape ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {shape === "line"
                  ? "Linia"
                  : shape === "rectangle"
                  ? "Prostokąt"
                  : shape === "circle"
                  ? "Okrąg"
                  : shape === "bezier"
                  ? "Krzywa"
                  : "Wielokąt"}
              </button>
            ))}
          </div>
        </div>

        {/* Parametry Transformacji */}
        {selectedShapeId && (
          <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
            <h3 className="font-semibold mb-3 text-purple-900">Transformacje (Wartości)</h3>

            {/* Translacja */}
            <div className="mb-3">
              <label className="text-xs font-bold text-gray-600 block mb-1">Przesunięcie (Wektor)</label>
              <div className="flex gap-2 mb-1">
                <input
                  type="number"
                  placeholder="dx"
                  className="w-1/2 px-2 py-1 border rounded text-sm"
                  value={transVector.x}
                  onChange={(e) => setTransVector({ ...transVector, x: parseFloat(e.target.value) || 0 })}
                />
                <input
                  type="number"
                  placeholder="dy"
                  className="w-1/2 px-2 py-1 border rounded text-sm"
                  value={transVector.y}
                  onChange={(e) => setTransVector({ ...transVector, y: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <button
                onClick={applyManualTranslate}
                className="w-full bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs py-1 rounded"
              >
                Zatwierdź Przesunięcie
              </button>
            </div>

            {/* Punkt odniesienia */}
            <div className="mb-3 border-t pt-2">
              <label className="text-xs font-bold text-gray-600 block mb-1">Punkt Odniesienia (Pivot)</label>
              <div className="flex gap-2 mb-1">
                <input
                  type="number"
                  placeholder="px"
                  className="w-1/2 px-2 py-1 border rounded text-sm"
                  value={manualPivot.x}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setManualPivot({ ...manualPivot, x: v });
                    if (pivotPoint) setPivotPoint({ ...pivotPoint, x: v });
                  }}
                />
                <input
                  type="number"
                  placeholder="py"
                  className="w-1/2 px-2 py-1 border rounded text-sm"
                  value={manualPivot.y}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value) || 0;
                    setManualPivot({ ...manualPivot, y: v });
                    if (pivotPoint) setPivotPoint({ ...pivotPoint, y: v });
                  }}
                />
              </div>
            </div>

            {/* Obrót */}
            <div className="mb-3">
              <label className="text-xs font-bold text-gray-600 block mb-1">Obrót (Stopnie)</label>
              <div className="flex gap-2 mb-1">
                <input
                  type="number"
                  placeholder="kąt"
                  className="w-full px-2 py-1 border rounded text-sm"
                  value={rotParams.angle}
                  onChange={(e) => setRotParams({ angle: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <button
                onClick={applyManualRotate}
                className="w-full bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs py-1 rounded"
              >
                Zatwierdź Obrót
              </button>
            </div>

            {/* Skalowanie */}
            <div className="mb-1">
              <label className="text-xs font-bold text-gray-600 block mb-1">Skalowanie (Współczynnik)</label>
              <div className="flex gap-2 mb-1">
                <input
                  type="number"
                  step="0.1"
                  placeholder="k"
                  className="w-full px-2 py-1 border rounded text-sm"
                  value={scaleParams.factor}
                  onChange={(e) => setScaleParams({ factor: parseFloat(e.target.value) || 1 })}
                />
              </div>
              <button
                onClick={applyManualScale}
                className="w-full bg-purple-100 hover:bg-purple-200 text-purple-900 text-xs py-1 rounded"
              >
                Zatwierdź Skalę
              </button>
            </div>
          </div>
        )}

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-gray-700">Styl</h3>
          <input
            type="color"
            value={currentColor}
            onChange={(e) => setCurrentColor(e.target.value)}
            className="w-full h-8 mb-2 cursor-pointer"
          />
          <input
            type="range"
            min="1"
            max="10"
            value={currentLineWidth}
            onChange={(e) => setCurrentLineWidth(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-gray-700">Definicja</h3>

          {currentShape === "polygon" ||
          (selectedShapeId && shapes.find((s) => s.id === selectedShapeId)?.type === "polygon") ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-500">Punkty (x,y; x,y; ...)</label>
              <textarea
                className="w-full p-2 border rounded text-sm font-mono h-24"
                value={polygonInput}
                onChange={(e) => setPolygonInput(e.target.value)}
                placeholder="100,100; 200,100; 150,200"
              />
              <button
                onClick={handleAddPolygonFromText}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm"
              >
                Rysuj / Aktualizuj
              </button>
            </div>
          ) : currentShape === "bezier" ? (
            <div className="space-y-2">
              <div className="mb-2">
                <label className="text-xs text-gray-500 font-semibold">Stopień krzywej: {bezierDegree}</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={bezierDegree}
                  onChange={(e) => setBezierDegree(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <button onClick={initializeBezierPoints} className="w-full text-xs bg-gray-200 p-1 rounded">
                Reset pól ({bezierDegree + 1})
              </button>
              {bezierPoints.map((p, i) => (
                <input
                  key={i}
                  value={p}
                  onChange={(e) => {
                    const n = [...bezierPoints];
                    n[i] = e.target.value;
                    setBezierPoints(n);
                  }}
                  className="w-full border text-xs p-1"
                  placeholder={`Pt ${i + 1}`}
                />
              ))}
              <button onClick={handleAddBezierFromForm} className="w-full bg-blue-600 text-white text-sm p-2 rounded">
                Dodaj Krzywą
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  placeholder="X1"
                  value={formParams.x1}
                  onChange={(e) => setFormParams({ ...formParams, x1: e.target.value })}
                  className="w-1/2 border text-sm p-1"
                />
                <input
                  placeholder="Y1"
                  value={formParams.y1}
                  onChange={(e) => setFormParams({ ...formParams, y1: e.target.value })}
                  className="w-1/2 border text-sm p-1"
                />
              </div>
              <div className="flex gap-2">
                <input
                  placeholder="X2"
                  value={formParams.x2}
                  onChange={(e) => setFormParams({ ...formParams, x2: e.target.value })}
                  className="w-1/2 border text-sm p-1"
                />
                <input
                  placeholder="Y2"
                  value={formParams.y2}
                  onChange={(e) => setFormParams({ ...formParams, y2: e.target.value })}
                  className="w-1/2 border text-sm p-1"
                />
              </div>
              <button onClick={handleAddShapeFromForm} className="w-full bg-blue-600 text-white text-sm p-2 rounded">
                Dodaj Kształt
              </button>
              {selectedShapeId && (
                <button
                  onClick={handleUpdateShapeFromForm}
                  className="w-full bg-orange-600 text-white text-sm p-2 rounded"
                >
                  Aktualizuj
                </button>
              )}
            </div>
          )}
        </div>

        {/* Eksport obrazu - PRZYWRÓCONE */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-3 text-gray-700">Eksport obrazu</h3>
          <div className="mb-3">
            <label className="text-xs text-gray-500 block mb-1">Jakość JPEG: {jpegQuality}%</label>
            <input
              type="range"
              min="1"
              max="100"
              value={jpegQuality}
              onChange={(e) => setJpegQuality(parseInt(e.target.value))}
              className="w-full"
            />
          </div>
          <button
            onClick={() => handleSaveJPEG(canvasRef.current, jpegQuality)}
            className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Download size={16} />
            Zapisz jako JPEG
          </button>
        </div>

        {/* Pliki / Akcje */}
        <div className="bg-white p-4 rounded-lg shadow space-y-2">
          <button
            onClick={() => handleSaveToFile(shapes)}
            className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm flex items-center justify-center gap-2"
          >
            <Download size={14} /> Zapisz JSON
          </button>
          <label className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm flex items-center justify-center gap-2 cursor-pointer">
            <Upload size={14} /> Wczytaj JSON{" "}
            <input type="file" onChange={(e) => handleLoadFromFile(e, setShapes)} className="hidden" accept=".json" />
          </label>
          <button
            onClick={handleClearCanvas}
            className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm flex items-center justify-center gap-2"
          >
            <Trash2 size={14} /> Wyczyść
          </button>
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="bg-white p-4 rounded-lg shadow sticky top-3">
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="font-semibold text-gray-700">Kanwa</h3>
              <p className="text-sm text-gray-600">
                Obiektów: {shapes.length} | Narzędzie: {currentTool}
              </p>
            </div>
            {(currentTool === "rotate" || currentTool === "scale") && pivotPoint && (
              <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                Pivot: ({pivotPoint.x.toFixed(0)}, {pivotPoint.y.toFixed(0)})
              </div>
            )}
          </div>
          <canvas
            ref={canvasRef}
            width={880}
            height={600}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className="border-2 border-gray-300 rounded cursor-crosshair bg-white w-full"
          />
          {isDrawing && (currentShape === "bezier" || currentShape === "polygon") && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={currentShape === "bezier" ? handleFinishBezier : handleFinishPolygon}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
              >
                Zakończ {currentShape === "bezier" ? "krzywą" : "wielokąt"} ({drawingPoints.length} pkt)
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
