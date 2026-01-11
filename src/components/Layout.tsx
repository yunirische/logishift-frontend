import React from "react";
import { clearAuthToken } from "../services/api";

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
}) => {
  const mainItems = [
    { id: "dashboard", label: "Dashboard", icon: "🏠" },
    { id: "shifts", label: "Смены", icon: "⏱️" },
    { id: "drivers", label: "Водители", icon: "👤" },
    { id: "fleet", label: "Автопарк", icon: "🚛" },
    { id: "objects", label: "Объекты", icon: "🏗️" },
  ];

  const adminItems = [
    { id: "audit", label: "Аудит", icon: "📜" },
    { id: "users", label: "Пользователи", icon: "👥" },
    { id: "settings", label: "Настройки", icon: "⚙️" },
  ];

  const handleLogout = () => {
    if (confirm("Вы уверены, что хотите выйти?")) {
      clearAuthToken();
      window.location.reload();
    }
  };

  const renderButton = (item: { id: string; label: string; icon: string }) => (
    <button
      key={item.id}
      onClick={() => setActiveTab(item.id)}
      className={`w-full flex items-center gap-4 px-5 py-3 rounded-2xl transition-all duration-200 group ${
        activeTab === item.id
          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 font-bold"
          : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50"
      }`}
    >
      <span
        className={`text-xl transition-transform group-hover:scale-110 ${
          activeTab === item.id ? "scale-110" : ""
        }`}
      >
        {item.icon}
      </span>
      <span className="text-sm">{item.label}</span>
    </button>
  );

  return (
    <div className="flex min-h-screen bg-[#F4F7FE]">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 hidden lg:flex flex-col sticky top-0 h-screen shadow-sm z-20">
        <div className="p-8">
          <h1 className="text-2xl font-black text-[#1B254B] flex items-center gap-2">
            <span className="text-indigo-600">LOGI</span>SHIFT
          </h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.2em] font-bold">
            KONTROLSMEN v2.0
          </p>
        </div>

        <nav className="flex-1 px-6 space-y-8 overflow-y-auto pb-6">
          {/* Main Section */}
          <div>
            <p className="px-5 mb-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Операции
            </p>
            <div className="space-y-1">{mainItems.map(renderButton)}</div>
          </div>

          {/* Admin Section */}
          <div>
            <p className="px-5 mb-3 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Система
            </p>
            <div className="space-y-1">{adminItems.map(renderButton)}</div>
          </div>
        </nav>

        <div className="p-6 border-t border-slate-50">
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 rounded-xl text-[11px] font-bold text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2"
          >
            <span>🚪</span> Выйти из системы
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/70 backdrop-blur-md border-b border-slate-50 flex items-center justify-between px-10 sticky top-0 z-10">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Управление
            </p>
            <h2 className="text-xl font-black text-[#1B254B] capitalize">
              {activeTab}
            </h2>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
            AD
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
