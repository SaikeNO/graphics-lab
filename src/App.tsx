import { ImageIcon, Shapes } from "lucide-react";
import Task1Primitives from "./components/Task1Primitives";
import Task2PPM from "./components/Task2PPM";
import { useState } from "react";

const App = () => {
  const [activeTask, setActiveTask] = useState<number>(1);

  const tasks = [
    { id: 1, name: "Zadanie 1: Prymitywy", icon: Shapes },
    { id: 2, name: "Zadanie 2: Format PPM", icon: ImageIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-3xl font-bold text-gray-800 mb-4">GraphicsLab - Grafika Komputerowa</h1>
          <nav className="flex gap-2 overflow-x-auto">
            {tasks.map((task) => {
              const Icon = task.icon;
              return (
                <button
                  key={task.id}
                  onClick={() => setActiveTask(task.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                    activeTask === task.id ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  <Icon size={18} />
                  {task.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTask === 1 && <Task1Primitives />}
        {activeTask === 2 && <Task2PPM />}
      </div>
    </div>
  );
};

export default App;
