import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Mic,
  Clock,
  Settings,
  X,
  Headphones,
} from "lucide-react";

const navItems = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    to: "/dashboard",
  },
  {
    icon: Upload,
    label: "Upload Audio",
    to: "/upload",
  },
  {
    icon: Mic,
    label: "Record Audio",
    to: "/record",
  },
  {
    icon: Clock,
    label: "History",
    to: "/history",
  },
  {
    icon: Settings,
    label: "Settings",
    to: "/settings",
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({
  open,
  onClose,
}: SidebarProps) {
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 h-full w-64
          bg-white border-r border-slate-200
          z-40 flex flex-col
          transform transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* ================================================== */}
        {/* LOGO */}
        {/* ================================================== */}

        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
          <Link
            to="/dashboard"
            className="flex items-center gap-2.5"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center">
              <Headphones
                size={16}
                className="text-white"
              />
            </div>

            <span
              className="font-semibold text-slate-900 text-[15px]"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              LectureIQ{" "}
              <span className="text-[#5B6EF8]">
                AI
              </span>
            </span>
          </Link>

          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-slate-400 hover:text-slate-600 p-1 rounded"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* ================================================== */}
        {/* NAVIGATION */}
        {/* ================================================== */}

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(
            ({ icon: Icon, label, to }) => {
              const active =
                location.pathname === to ||
                (to !== "/dashboard" &&
                  location.pathname.startsWith(to));

              return (
                <Link
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all ${
                    active
                      ? "bg-[#5B6EF8]/10 text-[#5B6EF8]"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-[#5B6EF8]"
                        : "text-slate-400"
                    }
                  />

                  {label}

                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#5B6EF8]" />
                  )}
                </Link>
              );
            }
          )}
        </nav>

        {/* ================================================== */}
        {/* NO PRO PLAN / UPGRADE CARD */}
        {/* ================================================== */}

      </aside>
    </>
  );
}