import { ImageIcon, Palette, Shapes } from "lucide-react";
import Task1Primitives from "./components/Task1Primitives";
import Task2PPM from "./components/Task2PPM";
import { useState } from "react";
import Task3ColorSpaces from "./components/Task3ColorSpaces";

const App = () => {
  const [activeTask, setActiveTask] = useState<number>(1);

  const tasks = [
    { id: 1, name: "Prymitywy", icon: Shapes },
    { id: 2, name: "Format PPM", icon: ImageIcon },
    { id: 3, name: "Przestrzenie Barw", icon: Palette },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-white shadow-md">
        <div className="mx-auto px-6 py-2">
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

      <div className="mx-auto px-6 py-6">
        {activeTask === 1 && <Task1Primitives />}
        {activeTask === 2 && <Task2PPM />}
        {activeTask === 3 && <Task3ColorSpaces />}
      </div>
    </div>
  );
};

export default App;
