import React, { useState } from "react";
import api from "../services/api";
import { UserRole } from "../types";
import {
  Menu,
  X,
  Home,
  Clock,
  Users,
  Truck,
  Building,
  ScrollText,
  Settings,
  BarChart,
  UserCog,
  LucideIcon,
} from "lucide-react";

// Demo persona type
type DemoPersona = 'admin' | 'driver';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  demoPersona?: DemoPersona;
  setDemoPersona?: (persona: DemoPersona) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  demoPersona = 'admin',
  setDemoPersona,
}) => {
  const user = api.getUserInfo();
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.FOREMAN;
  const isDemoMode = user?.tenant_id === 999;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handlePersonaSwitch = (newPersona: DemoPersona) => {
    if (setDemoPersona) {
      setDemoPersona(newPersona);
      setSidebarOpen(false);
    }
  };

  const mainItems = [
    {
      id: "dashboard",
      label: "Главная",
      icon: Home,
      roles: [UserRole.ADMIN, UserRole.DRIVER, UserRole.FOREMAN],
    },
    {
      id: "analytics",
      label: "Аналитика",
      icon: BarChart,
      roles: [UserRole.ADMIN, UserRole.FOREMAN],
    },
    {
      id: "shifts",
      label: isAdmin ? "Реестр смен" : "Мои смены",
      icon: Clock,
      roles: [UserRole.ADMIN, UserRole.DRIVER, UserRole.FOREMAN],
    },
    {
      id: "drivers",
      label: "Персонал",
      icon: Users,
      roles: [UserRole.ADMIN, UserRole.FOREMAN],
    },
    { id: "fleet", label: "Техника", icon: Truck, roles: [UserRole.ADMIN] },
    {
      id: "objects",
      label: "Объекты",
      icon: Building,
      roles: [UserRole.ADMIN, UserRole.FOREMAN],
    },
  ];

  const adminItems = [
    {
      id: "audit",
      label: "Журнал событий",
      icon: ScrollText,
      roles: [UserRole.ADMIN],
    },
    { id: "settings", label: "Система", icon: Settings, roles: [UserRole.ADMIN] },
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
    icon: LucideIcon;
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
            ? "bg-[#0a192f] text-white font-semibold"
            : "text-slate-400 hover:text-white hover:bg-slate-800"
        }`}
      >
        <div
          className={`transition-transform group-hover:rotate-12 ${
            activeTab === item.id ? "scale-110" : ""
          }`}
          aria-hidden="true"
        >
          <item.icon className="w-6 h-6" strokeWidth={2} />
        </div>
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
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-white">
              <span className="text-[#3b82f6]">LOGI</span>SHIFT
            </h1>
            {isDemoMode && (
              <span
                className="px-2 py-1 bg-amber-500 text-slate-900 text-[9px] font-bold uppercase tracking-wider rounded"
                title="В этом режиме все действия имитируются и не сохраняются в базе"
              >
                ДЕМО
              </span>
            )}
          </div>
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

          {/* Demo Persona Switcher */}
          {isDemoMode && setDemoPersona && (
            <div>
              <p className="px-5 mb-3 text-[10px] font-semibold text-amber-500 uppercase tracking-widest">
                Переключение режимов
              </p>
              <div className="px-5 space-y-2">
                <button
                  onClick={() => handlePersonaSwitch('admin')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    demoPersona === 'admin'
                      ? 'bg-amber-500 text-slate-900 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <UserCog className="w-5 h-5" strokeWidth={2} />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Администратор</p>
                    <p className={`text-[9px] uppercase tracking-wider ${demoPersona === 'admin' ? 'text-slate-800' : 'text-slate-500'}`}>
                  Панель управления
                </p>
                  </div>
                </button>
                <button
                  onClick={() => handlePersonaSwitch('driver')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    demoPersona === 'driver'
                      ? 'bg-amber-500 text-slate-900 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <Truck className="w-5 h-5" strokeWidth={2} />
                  <div className="text-left">
                    <p className="text-xs font-semibold">Водитель</p>
                    <p className={`text-[9px] uppercase tracking-wider ${demoPersona === 'driver' ? 'text-slate-800' : 'text-slate-500'}`}>
                  Мобильное приложение
                </p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </nav>

        <div className="p-6 border-t border-slate-800 mt-auto">
          <div className={`rounded-lg p-4 mb-4 ${isDemoMode ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-slate-800'}`}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">
                Аккаунт
              </p>
              {isDemoMode && (
                <span className="px-2 py-0.5 bg-amber-500 text-slate-900 text-[8px] font-bold uppercase rounded">
                  DEMO
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-white truncate mt-0.5">
              {user?.full_name}
            </p>
            <p className="text-[9px] font-semibold text-[#3b82f6] uppercase mt-1">
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
                {isDemoMode && demoPersona === 'driver' ? 'Водитель' : activeTab}
                {isDemoMode && demoPersona === 'driver' && (
                  <span className="ml-2 px-2 py-0.5 bg-amber-500 text-slate-900 text-[10px] font-bold uppercase rounded">
                    DEMO
                  </span>
                )}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {isDemoMode && (
              <span
                className="hidden sm:inline-block px-3 py-1 bg-amber-500 text-slate-900 text-[10px] font-bold uppercase tracking-wider rounded"
                title="В этом режиме все действия имитируются и не сохраняются в базе"
              >
                ДЕМО-РЕЖИМ
              </span>
            )}
            <div className="w-10 h-10 rounded-lg bg-[#0a192f]/10 text-[#0a192f] flex items-center justify-center font-semibold text-xs border border-[#0a192f]/20">
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
