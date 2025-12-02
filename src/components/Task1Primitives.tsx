import React, { useState, useRef, useEffect } from "react";
import {
  Download,
  Upload,
  Trash2,
  RefreshCw,
  Maximize,
  MousePointer2,
  PenTool,
  Move,
  Scaling,
  Square,
  Circle,
  Slash,
  Spline,
  Hexagon,
  Save,
  Check,
  X,
} from "lucide-react";
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

  // --- Stan Aplikacji ---
  const [shapes, setShapes] = useState<AnyShape[]>([]);
  const [currentTool, setCurrentTool] = useState<Tool>("draw");
  const [currentShape, setCurrentShape] = useState<ShapeType>("line");
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentLineWidth, setCurrentLineWidth] = useState(2);
  const [jpegQuality, setJpegQuality] = useState(90);

  // --- Stan Rysowania ---
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [bezierDegree, setBezierDegree] = useState(3);
  const [bezierPoints, setBezierPoints] = useState<string[]>([]);
  const [polygonInput, setPolygonInput] = useState("");

  // --- Stan Manipulacji ---
  const [draggedShape, setDraggedShape] = useState<string | null>(null);
  const [draggedHandle, setDraggedHandle] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [pivotPoint, setPivotPoint] = useState<Point | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // --- Parametry Transformacji Manualnej ---
  const [initialAngle, setInitialAngle] = useState<number>(0);
  const [initialScaleDist, setInitialScaleDist] = useState<number>(0);
  const [transVector, setTransVector] = useState({ x: 0, y: 0 });
  const [rotParams, setRotParams] = useState({ angle: 45 });
  const [scaleParams, setScaleParams] = useState({ factor: 1.5 });
  const [manualPivot, setManualPivot] = useState({ x: 0, y: 0 });
  const [formParams, setFormParams] = useState({ x1: "", y1: "", x2: "", y2: "" });

  // --- Efekt Rysowania ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rysuj tło "papieru"
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

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

  // --- Funkcje Pomocnicze Rysowania (Canvas API) ---

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
      ctx.strokeStyle = "#4f46e5"; // Indigo-600
      ctx.lineWidth = shape.lineWidth + 1;
      // Glow effect for selection
      ctx.shadowColor = "#818cf8";
      ctx.shadowBlur = 5;
    } else {
      ctx.shadowBlur = 0;
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
    ctx.shadowBlur = 0; // Reset shadow
  };

  const drawHandles = (ctx: CanvasRenderingContext2D, shape: AnyShape) => {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 2;
    shape.points.forEach((point) => {
      ctx.fillRect(point.x - 4, point.y - 4, 8, 8);
      ctx.strokeRect(point.x - 4, point.y - 4, 8, 8);
    });
  };

  // --- Logika Interakcji (Mouse Handlers) ---
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const findShapeAtPoint = (point: Point): AnyShape | null => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (isPointOnShape(point, shape)) return shape;
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

  // --- Funkcje Logiczne / Formularze ---

  const handleFinishPolygon = () => {
    if (drawingPoints.length < 3) return alert("Wielokąt musi mieć przynajmniej 3 punkty");
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
    if (points.length < 3) return alert("Podaj przynajmniej 3 punkty");
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
      if (isNaN(x) || isNaN(y)) return alert("Błędny format punktów");
      points.push({ x, y });
    }
    if (points.length < 2) return alert("Wymagane min. 2 punkty");
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
    if (currentShape === "bezier") return handleAddBezierFromForm();
    if (currentShape === "polygon") return handleAddPolygonFromText();
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
    setBezierPoints(new Array(numPoints).fill(""));
  };

  const handleClearCanvas = () => {
    if (confirm("Wyczyścić kanwę?")) {
      setShapes([]);
      setSelectedShapeId(null);
      setPivotPoint(null);
    }
  };

  // --- Komponenty UI ---

  const ToolButton = ({
    tool,
    icon: Icon,
    label,
  }: {
    tool: Tool;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>;
    label: string;
  }) => (
    <button
      onClick={() => setCurrentTool(tool)}
      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium w-full transition-colors ${
        currentTool === tool
          ? "bg-indigo-600 text-white shadow-sm"
          : "bg-white text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200"
      }`}
    >
      <Icon size={16} /> {label}
    </button>
  );

  const ShapeButton = ({
    shape,
    icon: Icon,
    label,
  }: {
    shape: ShapeType;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number }>;
    label: string;
  }) => (
    <button
      onClick={() => {
        setCurrentShape(shape);
        setCurrentTool("draw");
      }}
      className={`flex flex-col items-center justify-center p-2 rounded-md transition-colors border ${
        currentShape === shape
          ? "bg-indigo-50 border-indigo-200 text-indigo-700"
          : "bg-white border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200"
      }`}
    >
      <Icon size={20} className="mb-1" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );

  const PanelSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6 border-b border-gray-100 pb-4 last:border-0">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gray-50 text-gray-800 font-sans">
      {/* 1. Górny Pasek Narzędziowy */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="text-sm font-semibold text-gray-500">Edytor Prymitywów</div>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveToFile(shapes)}
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
              title="Zapisz Projekt (JSON)"
            >
              <Save size={18} />
            </button>
            <label
              className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
              title="Wczytaj Projekt (JSON)"
            >
              <Upload size={18} />
              <input type="file" onChange={(e) => handleLoadFromFile(e, setShapes)} className="hidden" accept=".json" />
            </label>
            <button
              onClick={handleClearCanvas}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Wyczyść Kanwę"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
            <span className="text-[10px] font-bold text-gray-500">JPG QUALITY</span>
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
            onClick={() => handleSaveJPEG(canvasRef.current, jpegQuality)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-colors shadow-sm"
          >
            <Download size={14} /> Eksportuj JPG
          </button>
        </div>
      </header>

      {/* 2. Główny Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEWY PANEL - NARZĘDZIA */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-4">
            <PanelSection title="Narzędzia">
              <div className="space-y-1">
                <ToolButton tool="select" icon={MousePointer2} label="Zaznacz / Edytuj" />
                <ToolButton tool="draw" icon={PenTool} label="Rysuj" />
                <ToolButton tool="move" icon={Move} label="Przesuń" />
                <ToolButton tool="resize" icon={Scaling} label="Zmień rozmiar" />
                <div className="grid grid-cols-2 gap-1">
                  <ToolButton tool="rotate" icon={RefreshCw} label="Obróć" />
                  <ToolButton tool="scale" icon={Maximize} label="Skaluj" />
                </div>
                {(currentTool === "rotate" || currentTool === "scale") && (
                  <p className="text-[10px] text-gray-400 italic px-1 mt-1">Ctrl + Click ustawia pivot point</p>
                )}
              </div>
            </PanelSection>

            <PanelSection title="Kształty">
              <div className="grid grid-cols-3 gap-2">
                <ShapeButton shape="line" icon={Slash} label="Linia" />
                <ShapeButton shape="rectangle" icon={Square} label="Prostokąt" />
                <ShapeButton shape="circle" icon={Circle} label="Okrąg" />
                <ShapeButton shape="bezier" icon={Spline} label="Krzywa" />
                <ShapeButton shape="polygon" icon={Hexagon} label="Wielokąt" />
              </div>
            </PanelSection>

            <PanelSection title="Styl">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">KOLOR LINII</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className="h-8 w-8 rounded cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={currentColor}
                      onChange={(e) => setCurrentColor(e.target.value)}
                      className="flex-1 text-xs border rounded px-2 uppercase font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">
                    GRUBOŚĆ: {currentLineWidth}px
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={currentLineWidth}
                    onChange={(e) => setCurrentLineWidth(Number(e.target.value))}
                    className="w-full h-1.5 accent-indigo-600 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </PanelSection>
          </div>
        </aside>

        {/* ŚRODEK - CANVAS */}
        <main className="flex-1 bg-gray-100 relative overflow-hidden flex items-center justify-center p-8">
          {/* Floating Action Bar (dla Bezier/Polygon) */}
          {isDrawing && (currentShape === "bezier" || currentShape === "polygon") && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-200 flex items-center gap-3 z-20 animate-in fade-in slide-in-from-top-4">
              <span className="text-xs font-medium text-gray-600">
                {currentShape === "bezier" ? "Tworzenie Krzywej" : "Tworzenie Wielokąta"}
                <span className="ml-1 bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">{drawingPoints.length} pkt</span>
              </span>
              <div className="h-4 w-px bg-gray-300"></div>
              <button
                onClick={currentShape === "bezier" ? handleFinishBezier : handleFinishPolygon}
                className="text-green-600 hover:text-green-700 p-1 rounded-full hover:bg-green-50"
                title="Zakończ"
              >
                <Check size={18} />
              </button>
              <button
                onClick={handleCancelBezier}
                className="text-red-500 hover:text-red-600 p-1 rounded-full hover:bg-red-50"
                title="Anuluj"
              >
                <X size={18} />
              </button>
            </div>
          )}

          <div className="relative shadow-xl border border-gray-300 bg-white">
            <canvas
              ref={canvasRef}
              width={880}
              height={600}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="block cursor-crosshair"
            />
            {/* Pivot Point Indicator overlay if needed, currently drawn on canvas */}
          </div>
        </main>

        {/* PRAWY PANEL - WŁAŚCIWOŚCI */}
        <aside className="w-72 bg-white border-l border-gray-200 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="p-4">
            {selectedShapeId ? (
              <>
                <div className="mb-4 bg-indigo-50 border border-indigo-100 p-3 rounded-md">
                  <h4 className="text-xs font-bold text-indigo-800 uppercase mb-1">Wybrany Obiekt</h4>
                  <p className="text-[10px] text-indigo-600 font-mono">ID: {selectedShapeId}</p>
                  <p className="text-[10px] text-indigo-600 font-mono">
                    Typ: {shapes.find((s) => s.id === selectedShapeId)?.type}
                  </p>
                </div>

                <PanelSection title="Transformacje Manualne">
                  <div className="space-y-4">
                    {/* Translacja */}
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">PRZESUNIĘCIE (DX, DY)</label>
                      <div className="flex gap-2 mb-1">
                        <input
                          type="number"
                          placeholder="dx"
                          value={transVector.x}
                          onChange={(e) => setTransVector((p) => ({ ...p, x: parseFloat(e.target.value) || 0 }))}
                          className="w-1/2 border rounded text-xs p-1"
                        />
                        <input
                          type="number"
                          placeholder="dy"
                          value={transVector.y}
                          onChange={(e) => setTransVector((p) => ({ ...p, y: parseFloat(e.target.value) || 0 }))}
                          className="w-1/2 border rounded text-xs p-1"
                        />
                      </div>
                      <button
                        onClick={applyManualTranslate}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1 rounded transition-colors"
                      >
                        Zastosuj
                      </button>
                    </div>

                    {/* Pivot */}
                    <div className="pt-2 border-t border-gray-100">
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">PUNKT PIVOT (X, Y)</label>
                      <div className="flex gap-2 mb-1">
                        <input
                          type="number"
                          value={manualPivot.x}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setManualPivot((p) => ({ ...p, x: v }));
                            if (pivotPoint) setPivotPoint((prev) => ({ ...prev!, x: v }));
                          }}
                          className="w-1/2 border rounded text-xs p-1"
                        />
                        <input
                          type="number"
                          value={manualPivot.y}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            setManualPivot((p) => ({ ...p, y: v }));
                            if (pivotPoint) setPivotPoint((prev) => ({ ...prev!, y: v }));
                          }}
                          className="w-1/2 border rounded text-xs p-1"
                        />
                      </div>
                    </div>

                    {/* Obrót / Skala */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">OBRÓT (°)</label>
                        <input
                          type="number"
                          value={rotParams.angle}
                          onChange={(e) => setRotParams({ angle: parseFloat(e.target.value) || 0 })}
                          className="w-full border rounded text-xs p-1 mb-1"
                        />
                        <button
                          onClick={applyManualRotate}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1 rounded"
                        >
                          Obróć
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">SKALA (k)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={scaleParams.factor}
                          onChange={(e) => setScaleParams({ factor: parseFloat(e.target.value) || 1 })}
                          className="w-full border rounded text-xs p-1 mb-1"
                        />
                        <button
                          onClick={applyManualScale}
                          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-1 rounded"
                        >
                          Skaluj
                        </button>
                      </div>
                    </div>
                  </div>
                </PanelSection>

                <PanelSection title="Edycja Współrzędnych">
                  <div className="space-y-2">
                    {shapes.find((s) => s.id === selectedShapeId)?.type === "polygon" ? (
                      <>
                        <textarea
                          value={polygonInput}
                          onChange={(e) => setPolygonInput(e.target.value)}
                          className="w-full h-24 border rounded text-xs p-1 font-mono"
                        />
                        <button
                          onClick={handleAddPolygonFromText}
                          className="w-full bg-blue-600 text-white text-xs py-1.5 rounded"
                        >
                          Aktualizuj Punkty
                        </button>
                      </>
                    ) : shapes.find((s) => s.id === selectedShapeId)?.type === "bezier" ? (
                      <div className="text-xs text-gray-500 italic">
                        Edycja punktów krzywej dostępna tylko przez przeciąganie w trybie Zmień Rozmiar.
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            placeholder="x1"
                            value={formParams.x1}
                            onChange={(e) => setFormParams({ ...formParams, x1: e.target.value })}
                            className="w-1/2 border rounded text-xs p-1"
                          />
                          <input
                            placeholder="y1"
                            value={formParams.y1}
                            onChange={(e) => setFormParams({ ...formParams, y1: e.target.value })}
                            className="w-1/2 border rounded text-xs p-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            placeholder="x2"
                            value={formParams.x2}
                            onChange={(e) => setFormParams({ ...formParams, x2: e.target.value })}
                            className="w-1/2 border rounded text-xs p-1"
                          />
                          <input
                            placeholder="y2"
                            value={formParams.y2}
                            onChange={(e) => setFormParams({ ...formParams, y2: e.target.value })}
                            className="w-1/2 border rounded text-xs p-1"
                          />
                        </div>
                        <button
                          onClick={handleUpdateShapeFromForm}
                          className="w-full bg-blue-600 text-white text-xs py-1.5 rounded"
                        >
                          Aktualizuj Współrzędne
                        </button>
                      </>
                    )}
                  </div>
                </PanelSection>
              </>
            ) : (
              <>
                <PanelSection title="Definicja Kształtu">
                  {currentShape === "bezier" ? (
                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 block mb-1">
                          STOPIEŃ: {bezierDegree}
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={bezierDegree}
                          onChange={(e) => setBezierDegree(parseInt(e.target.value))}
                          className="w-full h-1.5 accent-indigo-600 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>
                      <button
                        onClick={initializeBezierPoints}
                        className="w-full text-xs bg-gray-100 hover:bg-gray-200 p-1.5 rounded transition-colors"
                      >
                        Resetuj Formularz ({bezierDegree + 1} pkt)
                      </button>
                      <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {bezierPoints.map((p, i) => (
                          <input
                            key={i}
                            value={p}
                            onChange={(e) => {
                              const n = [...bezierPoints];
                              n[i] = e.target.value;
                              setBezierPoints(n);
                            }}
                            placeholder={`Pt ${i + 1} (x,y)`}
                            className="w-full border rounded text-xs p-1"
                          />
                        ))}
                      </div>
                      <button
                        onClick={handleAddBezierFromForm}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded transition-colors"
                      >
                        Dodaj z formularza
                      </button>
                    </div>
                  ) : currentShape === "polygon" ? (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 block">LISTA PUNKTÓW (x,y; x,y...)</label>
                      <textarea
                        value={polygonInput}
                        onChange={(e) => setPolygonInput(e.target.value)}
                        className="w-full h-24 border rounded text-xs p-1 font-mono"
                        placeholder="100,100; 200,50..."
                      />
                      <button
                        onClick={handleAddPolygonFromText}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded transition-colors"
                      >
                        Dodaj z tekstu
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-500 block">WSPÓŁRZĘDNE</label>
                      <div className="flex gap-2">
                        <input
                          placeholder="X1"
                          value={formParams.x1}
                          onChange={(e) => setFormParams({ ...formParams, x1: e.target.value })}
                          className="w-1/2 border rounded text-xs p-1"
                        />
                        <input
                          placeholder="Y1"
                          value={formParams.y1}
                          onChange={(e) => setFormParams({ ...formParams, y1: e.target.value })}
                          className="w-1/2 border rounded text-xs p-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          placeholder="X2"
                          value={formParams.x2}
                          onChange={(e) => setFormParams({ ...formParams, x2: e.target.value })}
                          className="w-1/2 border rounded text-xs p-1"
                        />
                        <input
                          placeholder="Y2"
                          value={formParams.y2}
                          onChange={(e) => setFormParams({ ...formParams, y2: e.target.value })}
                          className="w-1/2 border rounded text-xs p-1"
                        />
                      </div>
                      <button
                        onClick={handleAddShapeFromForm}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded transition-colors"
                      >
                        Dodaj manualnie
                      </button>
                    </div>
                  )}
                </PanelSection>

                <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100 text-center">
                  <p className="text-xs text-gray-400">
                    Wybierz obiekt na kanwie ("Zaznacz"), aby edytować jego transformacje.
                  </p>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Task1Primitives;
