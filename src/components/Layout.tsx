import React, { useState } from "react";
import api from "../services/api";
import { UserRole } from "../types";
import { Menu, X } from "lucide-react";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        onClick={() => {
          setActiveTab(item.id);
          setSidebarOpen(false);
        }}
        aria-label={item.label}
        aria-current={activeTab === item.id ? "page" : undefined}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActiveTab(item.id);
            setSidebarOpen(false);
          }
        }}
        className={`w-full flex items-center gap-4 px-5 py-3 rounded-lg transition-all duration-200 group ${
          activeTab === item.id
            ? "bg-indigo-600 text-white font-semibold"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
        }`}
      >
        <span
          className={`text-xl transition-transform group-hover:rotate-12 ${
            activeTab === item.id ? "scale-110" : ""
          }`}
          aria-hidden="true"
        >
          {item.icon}
        </span>
        <span className="text-sm font-semibold">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#F4F7FE]">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="sidebar-navigation"
        className={`fixed lg:sticky w-72 bg-[#111827] border-r border-slate-800 flex flex-col top-0 h-screen z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Основная навигация"
      >
        <div className="p-8">
          <h1 className="text-2xl font-semibold text-white">
            <span className="text-indigo-400">LOGI</span>SHIFT
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              KONTROLSMEN v2.4
            </p>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-8 overflow-y-auto">
          <div>
            <p className="px-5 mb-4 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              {isAdmin ? "Управление" : "Меню водителя"}
            </p>
            <div className="space-y-1">{mainItems.map(renderButton)}</div>
          </div>

          {isAdmin && user?.role === UserRole.ADMIN && (
            <div>
              <p className="px-5 mb-4 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Контроль
              </p>
              <div className="space-y-1">{adminItems.map(renderButton)}</div>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-800 mt-auto">
          <div className="bg-slate-800 rounded-lg p-4 mb-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">
              Аккаунт
            </p>
            <p className="text-xs font-semibold text-white truncate mt-0.5">
              {user?.full_name}
            </p>
            <p className="text-[9px] font-semibold text-indigo-400 uppercase mt-1">
              {user?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Выйти из системы"
            className="w-full py-4 px-4 rounded-lg text-[11px] font-semibold text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-all flex items-center justify-center gap-2 border border-slate-700"
          >
            <span aria-hidden="true">🚪</span>
            <span>Выход из системы</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pl-0 lg:pl-0">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-50 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              className="lg:hidden p-2"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={sidebarOpen ? "Закрыть меню" : "Открыть меню"}
              aria-expanded={sidebarOpen}
              aria-controls="sidebar-navigation"
            >
              {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <div>
              <h2 className="text-xl font-semibold text-[#1B254B] capitalize tracking-tight">
                {activeTab}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-semibold text-xs border border-indigo-100/50">
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
