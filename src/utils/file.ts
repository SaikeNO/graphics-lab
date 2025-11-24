import type { AnyShape } from "../types/types";

export const handleSaveToFile = (shapes: AnyShape[]) => {
  const data = JSON.stringify(shapes, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shapes.json";
  a.click();
  URL.revokeObjectURL(url);
};

export const handleSaveJPEG = (canvas: HTMLCanvasElement | null, jpegQuality: number) => {
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

export const handleLoadFromFile = (
  e: React.ChangeEvent<HTMLInputElement>,
  setData: React.Dispatch<React.SetStateAction<AnyShape[]>>
) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target?.result as string);
      setData(data);
    } catch {
      alert("Błąd wczytywania pliku");
    }
  };
  reader.readAsText(file);
};
