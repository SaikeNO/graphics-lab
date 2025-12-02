import { useState } from "react";
import { ImageIcon, Palette, Shapes, Monitor, ChevronLeft, ChevronRight, User } from "lucide-react";
import Task1Primitives from "./components/Task1Primitives";
import Task2PPM from "./components/Task2PPM"; // Upewnij się, że importujesz Task2ModernUI jako Task2PPM
import Task3ColorSpaces from "./components/Task3ColorSpaces";

const App = () => {
  const [activeTask, setActiveTask] = useState<number>(2);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const tasks = [
    {
      id: 1,
      name: "Prymitywy",
      description: "Rysowanie linii i kształtów",
      icon: Shapes,
    },
    {
      id: 2,
      name: "Edytor PPM",
      description: "Operacje na plikach i histogram",
      icon: ImageIcon,
    },
    {
      id: 3,
      name: "Przestrzenie Barw",
      description: "Konwersja RGB, CMYK, HSV",
      icon: Palette,
    },
  ];

  const renderContent = () => {
    switch (activeTask) {
      case 1:
        return <Task1Primitives />;
      case 2:
        return <Task2PPM />;
      case 3:
        return <Task3ColorSpaces />;
      default:
        return <Task2PPM />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden font-sans">
      {/* SIDEBAR - Nawigacja */}
      <aside
        className={`bg-white border-r border-gray-200 flex flex-col flex-shrink-0 shadow-sm z-20 transition-all duration-300 ease-in-out relative ${
          isCollapsed ? "w-20" : "w-72"
        }`}
      >
        {/* Przycisk zwijania (Floating Toggle) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-9 bg-white border border-gray-200 rounded-full p-1 shadow-sm text-gray-500 hover:text-indigo-600 hover:border-indigo-200 transition-colors z-30"
          title={isCollapsed ? "Rozwiń" : "Zwiń"}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Logo / Header Sidebara */}
        <div
          className={`p-6 border-b border-gray-100 flex items-center ${
            isCollapsed ? "justify-center px-0" : "justify-start"
          } h-[88px]`}
        >
          <div className="flex items-center gap-3 text-indigo-600 font-extrabold text-xl tracking-tight overflow-hidden whitespace-nowrap">
            <div className="flex-shrink-0">
              <Monitor size={28} />
            </div>
            <div>
              <div
                className={`transition-opacity duration-300 ${isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"}`}
              >
                <span>Grafika Komp.</span>
                <p className="text-xs text-gray-400">Zestaw narzędzi laboratoryjnych</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista Zadań */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2">
          {!isCollapsed && (
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3 transition-opacity duration-300">
              Laboratoria
            </p>
          )}

          {tasks.map((task) => {
            const Icon = task.icon;
            const isActive = activeTask === task.id;

            return (
              <button
                key={task.id}
                onClick={() => setActiveTask(task.id)}
                title={isCollapsed ? task.name : ""}
                className={`w-full group flex items-center px-3 py-3 rounded-xl transition-all duration-200 ease-in-out border overflow-hidden ${
                  isActive
                    ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm"
                    : "bg-transparent border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                } ${isCollapsed ? "justify-center" : "justify-start"}`}
              >
                <div
                  className={`flex-shrink-0 p-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-indigo-100 text-indigo-600"
                      : "bg-gray-100 text-gray-500 group-hover:bg-white group-hover:shadow-sm"
                  }`}
                >
                  <Icon size={20} />
                </div>

                <div
                  className={`ml-3 text-left transition-all duration-300 ${
                    isCollapsed ? "opacity-0 w-0 translate-x-10 absolute" : "opacity-100 w-auto translate-x-0 static"
                  }`}
                >
                  <span className="block font-semibold text-sm whitespace-nowrap">{task.name}</span>
                  <span
                    className={`text-[10px] block transition-colors whitespace-nowrap ${
                      isActive ? "text-indigo-400" : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  >
                    {task.description}
                  </span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer Sidebara */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 overflow-hidden">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-2"}`}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex flex-shrink-0 items-center justify-center text-white font-bold text-xs shadow-md">
              <User size={14} />
            </div>

            <div
              className={`transition-all duration-300 whitespace-nowrap ${
                isCollapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
              }`}
            >
              <p className="text-xs font-bold text-gray-700">Student</p>
              <p className="text-[10px] text-gray-500">Informatyka Sem. 5</p>
            </div>
          </div>
        </div>
      </aside>

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-gray-100 transition-all duration-300">
        <div className="flex-1 h-full w-full overflow-auto">{renderContent()}</div>
      </main>
    </div>
  );
};

export default App;
