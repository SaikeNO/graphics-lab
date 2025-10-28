import { useState } from "react";
import Converter from "./task3/Converter";
import Cube from "./task3/Cube";

const Task3ColorSpaces = () => {
  const [mode, setMode] = useState<"converter" | "cube">("converter");

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("converter")}
            className={`px-4 py-2 rounded font-medium ${
              mode === "converter" ? "bg-blue-600 text-white" : "bg-gray-200"
            }`}
          >
            Konwerter RGB/CMYK
          </button>
          <button
            onClick={() => setMode("cube")}
            className={`px-4 py-2 rounded font-medium ${mode === "cube" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            Kostka RGB
          </button>
        </div>

        {mode === "converter" && <Converter />}

        {mode === "cube" && <Cube />}
      </div>
    </div>
  );
};

export default Task3ColorSpaces;
