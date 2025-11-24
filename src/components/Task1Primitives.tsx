import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Trash2,
  RefreshCw,
  Maximize,
  MousePointer2,
  Scaling,
  Minus,
  Square,
  Circle,
  PenTool,
  Hexagon,
  Check,
  X,
  Move,
  Settings2,
  Image as ImageIcon,
  Save,
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

// Pomocniczy komponent przycisku narzędzia
const ToolButton = ({
  active,
  onClick,
  children,
  title,
  colorClass = "bg-indigo-600 text-white",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title: string;
  colorClass?: string;
}) => (
  <button
    onClick={onClick}
    title={title}
    className={`p-2.5 rounded-lg transition-all duration-200 flex items-center justify-center shadow-sm ${
      active
        ? `${colorClass} ring-2 ring-offset-1 ring-indigo-300`
        : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 hover:border-slate-300"
    }`}
  >
    {children}
  </button>
);

const SectionHeader = ({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number; className?: string }>;
  title: string;
}) => (
  <div className="flex items-center gap-2 mb-3 text-slate-800 font-semibold text-sm border-b border-slate-100 pb-2">
    <Icon size={16} className="text-indigo-500" />
    <span>{title}</span>
  </div>
);

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

  // --- LOGIKA RYSOWANIA ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Rysowanie tła (siatka)
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= canvas.width; x += 40) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
    }
    for (let y = 0; y <= canvas.height; y += 40) {
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
    }
    ctx.stroke();

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
    ctx.fillStyle = "rgba(236, 72, 153, 0.5)"; // Pink-500 alpha
    ctx.fill();
    ctx.strokeStyle = "#db2777"; // Pink-600
    ctx.lineWidth = 2;
    ctx.stroke();
    // Krzyżyk
    ctx.beginPath();
    ctx.moveTo(p.x - 8, p.y);
    ctx.lineTo(p.x + 8, p.y);
    ctx.moveTo(p.x, p.y - 8);
    ctx.lineTo(p.x, p.y + 8);
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
      ctx.strokeStyle = "#94a3b8"; // Slate-400
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x, drawingPoints[0].y);
      for (let i = 1; i < drawingPoints.length; i++) ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
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
      for (let i = 1; i < drawingPoints.length; i++) ctx.lineTo(drawingPoints[i].x, drawingPoints[i].y);
    }
    ctx.stroke();
    ctx.fillStyle = currentColor;
    drawingPoints.forEach((p) => ctx.fillRect(p.x - 3, p.y - 3, 6, 6));
  };

  const drawBezierCurve = (ctx: CanvasRenderingContext2D, points: Point[], showControlLines = false) => {
    if (points.length < 2) return;
    if (showControlLines) {
      ctx.save();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      ctx.fillStyle = "#475569";
      points.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
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
      ctx.shadowColor = "rgba(79, 70, 229, 0.4)";
      ctx.shadowBlur = 6;
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
          const w = shape.points[1].x - shape.points[0].x;
          const h = shape.points[1].y - shape.points[0].y;
          ctx.strokeRect(shape.points[0].x, shape.points[0].y, w, h);
        }
        break;
      case "circle":
        if (shape.points.length >= 2) {
          const r = Math.sqrt(
            Math.pow(shape.points[1].x - shape.points[0].x, 2) + Math.pow(shape.points[1].y - shape.points[0].y, 2)
          );
          ctx.beginPath();
          ctx.arc(shape.points[0].x, shape.points[0].y, r, 0, 2 * Math.PI);
          ctx.stroke();
        }
        break;
      case "bezier":
        if (shape.points.length >= 2) drawBezierCurve(ctx, shape.points, shape.selected && !isTemp);
        break;
      case "polygon":
        if (shape.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i].x, shape.points[i].y);
          ctx.closePath();
          ctx.stroke();
        }
        break;
    }
    // Reset shadow
    ctx.shadowBlur = 0;
  };

  const drawHandles = (ctx: CanvasRenderingContext2D, shape: AnyShape) => {
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#4f46e5";
    ctx.lineWidth = 2;
    shape.points.forEach((point) => {
      ctx.fillRect(point.x - 4, point.y - 4, 8, 8);
      ctx.strokeRect(point.x - 4, point.y - 4, 8, 8);
    });
  };

  // --- OBSŁUGA ZDARZEŃ ---
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const findShapeAtPoint = (point: Point): AnyShape | null => {
    for (let i = shapes.length - 1; i >= 0; i--) {
      if (isPointOnShape(point, shapes[i])) return shapes[i];
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
        // Do nothing, wait for clicks
      } else if (["line", "rectangle", "circle"].includes(currentShape)) {
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
      const deltaDeg = (currentAngle - initialAngle) * (180 / Math.PI);
      const M = getRotationAroundPointMatrix(deltaDeg, pivotPoint.x, pivotPoint.y);
      setShapes(
        shapes.map((s) => {
          if (s.id === draggedShape) {
            return { ...s, points: s.points.map((p) => applyMatrixToPoint(M, p)) as [Point, Point] };
          }
          return s;
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
        shapes.map((s) => {
          if (s.id === draggedShape) {
            return { ...s, points: s.points.map((p) => applyMatrixToPoint(M, p)) as [Point, Point] };
          }
          return s;
        })
      );
      setInitialScaleDist(currentDist);
    }
  };

  const handleMouseUp = () => {
    if (currentTool === "draw" && isDrawing) {
      if (currentShape === "bezier" || currentShape === "polygon") {
        // Do nothing, wait for user to finish
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

  // --- FUNKCJE POMOCNICZE ---
  const handleFinishPolygon = () => {
    if (drawingPoints.length < 3) {
      alert("Min 3 punkty");
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

  const handleAddPolygonFromText = () => {
    const pointsStr = polygonInput.split(";");
    const points: Point[] = [];
    for (const p of pointsStr) {
      const [x, y] = p.trim().split(",").map(Number);
      if (!isNaN(x) && !isNaN(y)) points.push({ x, y });
    }

    if (points.length < 3) {
      alert("Min 3 punkty (format: x,y; x,y; x,y)");
      return;
    }

    // --- NOWA CZĘŚĆ: AKTUALIZACJA ---
    if (selectedShapeId) {
      const selectedShape = shapes.find((s) => s.id === selectedShapeId);
      if (selectedShape && selectedShape.type === "polygon") {
        setShapes(
          shapes.map((s) => {
            if (s.id === selectedShapeId) {
              return { ...s, points: points as [Point, Point] };
            }
            return s;
          })
        );
        return; // Ważne: wychodzimy z funkcji, żeby nie dodać duplikatu
      }
    }
    // --------------------------------

    // Jeśli nic nie jest zaznaczone, dodajemy nowy
    setShapes([
      ...shapes,
      {
        id: Date.now().toString(),
        type: "polygon",
        color: currentColor,
        lineWidth: currentLineWidth,
        points: points,
        selected: false,
      },
    ]);
    setPolygonInput("");
  };

  const updateFormFromShape = (shape: AnyShape) => {
    if (shape.type === "bezier") setBezierPoints(shape.points.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`));
    else if (shape.type === "polygon")
      setPolygonInput(shape.points.map((p) => `${p.x.toFixed(0)},${p.y.toFixed(0)}`).join("; "));
    else if (shape.points.length >= 2)
      setFormParams({
        x1: shape.points[0].x.toFixed(0),
        y1: shape.points[0].y.toFixed(0),
        x2: shape.points[1].x.toFixed(0),
        y2: shape.points[1].y.toFixed(0),
      });
  };

  const applyManualTranslate = () => {
    if (!selectedShapeId) return;
    const T = createTranslationMatrix(transVector.x, transVector.y);
    setShapes(
      shapes.map((s) =>
        s.id === selectedShapeId ? { ...s, points: s.points.map((p) => applyMatrixToPoint(T, p)) as [Point, Point] } : s
      )
    );
    if (pivotPoint) setPivotPoint({ x: pivotPoint.x + transVector.x, y: pivotPoint.y + transVector.y });
  };
  const applyManualRotate = () => {
    if (!selectedShapeId) return;
    const M = getRotationAroundPointMatrix(rotParams.angle, manualPivot.x, manualPivot.y);
    setShapes(
      shapes.map((s) =>
        s.id === selectedShapeId ? { ...s, points: s.points.map((p) => applyMatrixToPoint(M, p)) as [Point, Point] } : s
      )
    );
  };
  // PRZYWRÓCONA FUNKCJA
  const applyManualScale = () => {
    if (!selectedShapeId) return;
    const M = getScaleAroundPointMatrix(scaleParams.factor, manualPivot.x, manualPivot.y);
    setShapes(
      shapes.map((s) =>
        s.id === selectedShapeId ? { ...s, points: s.points.map((p) => applyMatrixToPoint(M, p)) as [Point, Point] } : s
      )
    );
  };

  const initializeBezierPoints = () => {
    setBezierPoints(Array(bezierDegree + 1).fill(""));
  };
  const handleAddBezierFromForm = () => {
    const points: Point[] = bezierPoints
      .map((s) => {
        const [x, y] = s.split(",").map(Number);
        return { x, y };
      })
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
    if (points.length < 2) return;
    setShapes([
      ...shapes,
      {
        id: Date.now().toString(),
        type: "bezier",
        color: currentColor,
        lineWidth: currentLineWidth,
        points,
        selected: false,
      },
    ]);
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
    const [x1, y1, x2, y2] = [formParams.x1, formParams.y1, formParams.x2, formParams.y2].map(parseFloat);
    if (isNaN(x1) || isNaN(y1)) return;
    setShapes([
      ...shapes,
      {
        id: Date.now().toString(),
        type: currentShape,
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
    const [x1, y1, x2, y2] = [formParams.x1, formParams.y1, formParams.x2, formParams.y2].map(parseFloat);
    setShapes(
      shapes.map((s) =>
        s.id === selectedShapeId && !["bezier", "polygon"].includes(s.type)
          ? {
              ...s,
              points: [
                { x: x1, y: y1 },
                { x: x2, y: y2 },
              ] as [Point, Point],
            }
          : s
      )
    );
  };
  const handleClearCanvas = () => {
    if (confirm("Wyczyścić?")) {
      setShapes([]);
      setSelectedShapeId(null);
      setPivotPoint(null);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-700">
      {/* LEFT SIDEBAR: Tools & Styles */}
      <div className="w-16 flex flex-col items-center py-4 bg-white border-r border-slate-200 shadow-sm z-10 gap-4">
        <div className="flex flex-col gap-2 w-full px-2">
          <div className="text-[10px] uppercase font-bold text-center text-slate-400 mb-1">Tools</div>
          <ToolButton title="Rysuj (Draw)" active={currentTool === "draw"} onClick={() => setCurrentTool("draw")}>
            <PenTool size={20} />
          </ToolButton>
          <ToolButton
            title="Zaznacz (Select)"
            active={currentTool === "select"}
            onClick={() => setCurrentTool("select")}
          >
            <MousePointer2 size={20} />
          </ToolButton>
          <ToolButton title="Przesuń (Move)" active={currentTool === "move"} onClick={() => setCurrentTool("move")}>
            <Move size={20} />
          </ToolButton>
          <ToolButton
            title="Zmień rozmiar (Resize)"
            active={currentTool === "resize"}
            onClick={() => setCurrentTool("resize")}
          >
            <Scaling size={20} />
          </ToolButton>
          <ToolButton
            title="Obróć (Rotate)"
            active={currentTool === "rotate"}
            onClick={() => setCurrentTool("rotate")}
            colorClass="bg-purple-600 text-white"
          >
            <RefreshCw size={20} />
          </ToolButton>
          <ToolButton
            title="Skaluj (Scale)"
            active={currentTool === "scale"}
            onClick={() => setCurrentTool("scale")}
            colorClass="bg-purple-600 text-white"
          >
            <Maximize size={20} />
          </ToolButton>
        </div>

        <div className="h-px w-8 bg-slate-200 my-1"></div>

        <div className="flex flex-col gap-2 w-full px-2">
          <div className="text-[10px] uppercase font-bold text-center text-slate-400 mb-1">Shapes</div>
          <ToolButton
            title="Linia"
            active={currentShape === "line"}
            onClick={() => setCurrentShape("line")}
            colorClass="bg-emerald-600 text-white"
          >
            <Minus size={20} className="-rotate-45" />
          </ToolButton>
          <ToolButton
            title="Prostokąt"
            active={currentShape === "rectangle"}
            onClick={() => setCurrentShape("rectangle")}
            colorClass="bg-emerald-600 text-white"
          >
            <Square size={20} />
          </ToolButton>
          <ToolButton
            title="Okrąg"
            active={currentShape === "circle"}
            onClick={() => setCurrentShape("circle")}
            colorClass="bg-emerald-600 text-white"
          >
            <Circle size={20} />
          </ToolButton>
          <ToolButton
            title="Krzywa Beziera"
            active={currentShape === "bezier"}
            onClick={() => setCurrentShape("bezier")}
            colorClass="bg-emerald-600 text-white"
          >
            <Settings2 size={20} />
          </ToolButton>
          <ToolButton
            title="Wielokąt"
            active={currentShape === "polygon"}
            onClick={() => setCurrentShape("polygon")}
            colorClass="bg-emerald-600 text-white"
          >
            <Hexagon size={20} />
          </ToolButton>
        </div>
      </div>

      {/* CENTER: Canvas */}
      <div className="flex-1 relative bg-slate-100 flex flex-col items-center justify-center p-8 overflow-hidden">
        <div className="absolute top-4 left-4 text-xs text-slate-500 bg-white/50 backdrop-blur px-3 py-1 rounded-full border border-slate-200">
          Mode: <span className="font-bold text-indigo-600 uppercase">{currentTool}</span>
          {shapes.filter((s) => s.selected).length > 0 && (
            <span className="ml-2 text-indigo-500">Selected: {shapes.find((s) => s.selected)?.type}</span>
          )}
        </div>

        {/* Floating Actions for Drawing */}
        {isDrawing && (currentShape === "bezier" || currentShape === "polygon") && (
          <div className="absolute top-20 z-20 flex gap-2 animate-in fade-in slide-in-from-top-4">
            <button
              onClick={currentShape === "bezier" ? handleFinishBezier : handleFinishPolygon}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full shadow-lg font-medium transition-transform active:scale-95"
            >
              <Check size={16} /> Zakończ ({drawingPoints.length})
            </button>
            <button
              onClick={handleCancelBezier}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-rose-50 text-rose-500 border border-rose-200 rounded-full shadow-lg font-medium transition-transform active:scale-95"
            >
              <X size={16} /> Anuluj
            </button>
          </div>
        )}

        <div className="relative shadow-2xl rounded-sm overflow-hidden border border-slate-300 bg-white">
          <canvas
            ref={canvasRef}
            width={880}
            height={600}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`cursor-${currentTool === "draw" ? "crosshair" : currentTool === "move" ? "move" : "default"}`}
          />
        </div>

        <div className="mt-4 flex gap-4 text-xs text-slate-400">
          <span>Ctrl + Drag: Set Pivot Point</span>
          <span>Objects: {shapes.length}</span>
        </div>
      </div>

      {/* RIGHT SIDEBAR: Properties */}
      <div className="w-80 bg-white border-l border-slate-200 h-full flex flex-col shadow-lg z-10">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-700">Właściwości</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* STYLE PANEL */}
          <div>
            <SectionHeader icon={Settings2} title="Styl" />
            <div className="grid grid-cols-5 gap-2 mb-3">
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="col-span-1 h-9 w-full rounded cursor-pointer border-0 p-0"
              />
              <div className="col-span-4 flex flex-col justify-center">
                <label className="text-[10px] text-slate-500 uppercase font-bold">Grubość: {currentLineWidth}px</label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={currentLineWidth}
                  onChange={(e) => setCurrentLineWidth(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* TRANSFORMS PANEL */}
          {selectedShapeId && (
            <div className="animate-in slide-in-from-right-4 fade-in duration-300">
              <SectionHeader icon={Move} title="Transformacje" />
              <div className="space-y-4 ">
                {/* Translate */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                    Przesunięcie (Vector)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="X"
                      className="w-full px-2 py-1 border rounded text-sm"
                      value={transVector.x}
                      onChange={(e) => setTransVector({ ...transVector, x: parseFloat(e.target.value) || 0 })}
                    />
                    <input
                      type="number"
                      placeholder="Y"
                      className="w-full px-2 py-1 border rounded text-sm"
                      value={transVector.y}
                      onChange={(e) => setTransVector({ ...transVector, y: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <button
                    onClick={applyManualTranslate}
                    className="w-full mt-2 bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-600 text-xs py-1 rounded transition"
                  >
                    Apply
                  </button>
                </div>

                {/* Rotate */}
                <div className="border-t border-slate-200 pt-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Obrót (Stopnie)</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={rotParams.angle}
                      onChange={(e) => setRotParams({ angle: parseFloat(e.target.value) || 0 })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                    <button
                      onClick={applyManualRotate}
                      className="bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-600 px-3 rounded text-xs"
                    >
                      OK
                    </button>
                  </div>
                </div>

                {/* DODANA SEKCJA SCALE */}
                <div className="border-t border-slate-200 pt-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">
                    Skalowanie (Współczynnik)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      value={scaleParams.factor}
                      onChange={(e) => setScaleParams({ factor: parseFloat(e.target.value) || 1 })}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                    <button
                      onClick={applyManualScale}
                      className="bg-white border border-slate-200 hover:bg-indigo-50 text-indigo-600 px-3 rounded text-xs"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MANUAL CREATION PANEL */}
          <div>
            <SectionHeader icon={PenTool} title="Definicja Kształtu" />
            {currentShape === "polygon" ? (
              <div className="space-y-2">
                <textarea
                  className="w-full p-2 border rounded text-xs font-mono h-20 bg-slate-50"
                  value={polygonInput}
                  onChange={(e) => setPolygonInput(e.target.value)}
                  placeholder="100,100; 200,100..."
                />
                <button
                  onClick={handleAddPolygonFromText}
                  className="w-full py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                >
                  Aktualizuj / Rysuj
                </button>
              </div>
            ) : currentShape === "bezier" ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span>Stopień: {bezierDegree}</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={bezierDegree}
                    onChange={(e) => setBezierDegree(parseInt(e.target.value))}
                    className="w-20 accent-indigo-500"
                  />
                </div>
                <button
                  onClick={initializeBezierPoints}
                  className="w-full text-xs py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-600"
                >
                  Resetuj Pola
                </button>
                <div className="grid grid-cols-2 gap-2">
                  {bezierPoints.map((p, i) => (
                    <input
                      key={i}
                      value={p}
                      onChange={(e) => {
                        const n = [...bezierPoints];
                        n[i] = e.target.value;
                        setBezierPoints(n);
                      }}
                      className="border text-xs p-1 rounded"
                      placeholder={`Pt ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  onClick={handleAddBezierFromForm}
                  className="w-full py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                >
                  Dodaj Krzywą
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold">START (X,Y)</label>
                    <div className="flex gap-1">
                      <input
                        placeholder="X1"
                        value={formParams.x1}
                        onChange={(e) => setFormParams({ ...formParams, x1: e.target.value })}
                        className="w-full border rounded text-xs p-1.5"
                      />
                      <input
                        placeholder="Y1"
                        value={formParams.y1}
                        onChange={(e) => setFormParams({ ...formParams, y1: e.target.value })}
                        className="w-full border rounded text-xs p-1.5"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold">END (X,Y)</label>
                    <div className="flex gap-1">
                      <input
                        placeholder="X2"
                        value={formParams.x2}
                        onChange={(e) => setFormParams({ ...formParams, x2: e.target.value })}
                        className="w-full border rounded text-xs p-1.5"
                      />
                      <input
                        placeholder="Y2"
                        value={formParams.y2}
                        onChange={(e) => setFormParams({ ...formParams, y2: e.target.value })}
                        className="w-full border rounded text-xs p-1.5"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleAddShapeFromForm}
                    className="flex-1 py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 font-medium"
                  >
                    Dodaj
                  </button>
                  {selectedShapeId && (
                    <button
                      onClick={handleUpdateShapeFromForm}
                      className="flex-1 py-1.5 bg-amber-500 text-white rounded text-xs hover:bg-amber-600 font-medium"
                    >
                      Zmień
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>JPEG Quality</span>
              <span>{jpegQuality}%</span>
            </div>
            <input
              type="range"
              value={jpegQuality}
              onChange={(e) => setJpegQuality(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-slate-600"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleSaveJPEG(canvasRef.current, jpegQuality)}
              title="Save JPEG"
              className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600 flex justify-center"
            >
              <ImageIcon size={18} />
            </button>
            <button
              onClick={() => handleSaveToFile(shapes)}
              title="Save JSON"
              className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600 flex justify-center"
            >
              <Save size={18} />
            </button>
            <label className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-50 text-slate-600 flex justify-center cursor-pointer">
              <Upload size={18} />
              <input type="file" onChange={(e) => handleLoadFromFile(e, setShapes)} className="hidden" accept=".json" />
            </label>
          </div>
          <button
            onClick={handleClearCanvas}
            className="w-full flex items-center justify-center gap-2 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-xs font-bold transition-colors"
          >
            <Trash2 size={14} /> Clear Canvas
          </button>
        </div>
      </div>
    </div>
  );
};

export default Task1Primitives;
