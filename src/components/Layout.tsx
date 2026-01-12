import React from "react";
import api from "../services/api";
import { UserRole } from "../types";

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
  const user = api.getUserInfo();
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FOREMAN;

  const mainItems = [
    {
      id: "dashboard",
      label: "Главная",
      icon: "🏠",
      roles: [UserRole.ADMIN, UserRole.DRIVER, UserRole.FOREMAN],
    },
    {
      id: "shifts",
      label: isAdmin ? "Реестр смен" : "Мои смены",
      icon: "⏱️",
      roles: [UserRole.ADMIN, UserRole.DRIVER, UserRole.FOREMAN],
    },
    {
      id: "drivers",
      label: "Персонал",
      icon: "👥",
      roles: [UserRole.ADMIN, UserRole.FOREMAN],
    },
    { id: "fleet", label: "Техника", icon: "🚛", roles: [UserRole.ADMIN] },
    {
      id: "objects",
      label: "Объекты",
      icon: "🏗️",
      roles: [UserRole.ADMIN, UserRole.FOREMAN],
    },
  ];

  const adminItems = [
    {
      id: "audit",
      label: "Журнал событий",
      icon: "📜",
      roles: [UserRole.ADMIN],
    },
    { id: "settings", label: "Система", icon: "⚙️", roles: [UserRole.ADMIN] },
  ];

  const handleLogout = () => {
    if (confirm("Завершить сессию и выйти из системы?")) {
      // 1. Очищаем токен через API сервис
      api.clearAuth();
      // 2. Полная зачистка хранилищ браузера
      localStorage.clear();
      sessionStorage.clear();
      // 3. Жесткая перезагрузка страницы для сброса всех состояний React
      window.location.replace("/");
    }
  };

  const renderButton = (item: {
    id: string;
    label: string;
    icon: string;
    roles: string[];
  }) => {
    if (!user || !item.roles.includes(user.role)) return null;

    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        className={`w-full flex items-center gap-4 px-5 py-3 rounded-2xl transition-all duration-200 group ${
          activeTab === item.id
            ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200 font-bold"
            : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50"
        }`}
      >
        <span
          className={`text-xl transition-transform group-hover:rotate-12 ${
            activeTab === item.id ? "scale-110" : ""
          }`}
        >
          {item.icon}
        </span>
        <span className="text-sm font-semibold">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F4F7FE]">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-slate-100 hidden lg:flex flex-col sticky top-0 h-screen z-20">
        <div className="p-8">
          <h1 className="text-2xl font-black text-[#1B254B]">
            <span className="text-indigo-600">LOGI</span>SHIFT
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
              KONTROLSMEN v2.4
            </p>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-8 overflow-y-auto">
          <div>
            <p className="px-5 mb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
              {isAdmin ? "Управление" : "Меню водителя"}
            </p>
            <div className="space-y-1">{mainItems.map(renderButton)}</div>
          </div>

          {isAdmin && user?.role === UserRole.ADMIN && (
            <div>
              <p className="px-5 mb-4 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                Контроль
              </p>
              <div className="space-y-1">{adminItems.map(renderButton)}</div>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-50 mt-auto">
          <div className="bg-slate-50 rounded-2xl p-4 mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              Аккаунт
            </p>
            <p className="text-xs font-black text-[#1B254B] truncate mt-0.5">
              {user?.full_name}
            </p>
            <p className="text-[9px] font-bold text-indigo-500 uppercase mt-1">
              {user?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="w-full py-4 px-4 rounded-xl text-[11px] font-bold text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center gap-2 border border-slate-100"
          >
            🚪 Выход из системы
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-50 flex items-center justify-between px-10 sticky top-0 z-30">
          <div>
            <h2 className="text-xl font-black text-[#1B254B] capitalize tracking-tight">
              {activeTab}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs border border-indigo-100/50">
              {user?.full_name?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-10 overflow-x-hidden">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
