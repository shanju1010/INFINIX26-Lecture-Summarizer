import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const THEME_KEY = "audiomind_theme";

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem(THEME_KEY) === "dark"
  );

  useEffect(() => {
    const syncTheme = () => {
      setDarkMode(localStorage.getItem(THEME_KEY) === "dark");
    };

    // Keep AppLayout in sync when Settings changes the theme.
    window.addEventListener("storage", syncTheme);
    window.addEventListener("audiomind-theme-change", syncTheme);

    syncTheme();

    return () => {
      window.removeEventListener("storage", syncTheme);
      window.removeEventListener("audiomind-theme-change", syncTheme);
    };
  }, []);

  return (
    <div
      className={`flex min-h-full ${
        darkMode ? "bg-[#0F172A] text-slate-200" : "bg-[#F8FAFC] text-slate-900"
      }`}
    >
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:ml-0">
        <Topbar onMenuToggle={() => setSidebarOpen(true)} />

        <main
          className={`flex-1 overflow-y-auto p-4 lg:p-6 ${
            darkMode ? "bg-[#0F172A]" : "bg-[#F8FAFC]"
          }`}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
