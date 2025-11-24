import { BarChart3, ImageIcon, Palette, Shapes } from "lucide-react";
import Task1Primitives from "./components/Task1Primitives";
import Task2PPM from "./components/Task2PPM";
import { useState } from "react";
import Task3ColorSpaces from "./components/Task3ColorSpaces";
import HistogramBinarization from "./components/HistogramBinarization";

const App = () => {
  const [activeTask, setActiveTask] = useState<number>(1);

  const tasks = [
    { id: 1, name: "Prymitywy", icon: Shapes },
    { id: 2, name: "Format PPM", icon: ImageIcon },
    { id: 3, name: "Przestrzenie Barw", icon: Palette },
    { id: 4, name: "Histogram", icon: BarChart3 },
  ];

  return <Task1Primitives />;
};

export default App;
