import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Bell, Menu, ChevronDown, LogOut, Settings } from "lucide-react";

interface TopbarProps {
  onMenuToggle: () => void;
  title?: string;
}

const notifications = [
  { id: 1, text: "Lecture_Week5.mp3 processed successfully", time: "2m ago", unread: true },
  { id: 2, text: "Team Meeting summary ready", time: "1h ago", unread: true },
  { id: 3, text: "New speaker detected in session", time: "3h ago", unread: false },
];

interface AuthUser {
  name?: string;
  email?: string;
  role?: string;
  isLoggedIn?: boolean;
}

export default function Topbar({ onMenuToggle, title }: TopbarProps) {
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const getAuthUser = (): AuthUser => {
    try {
      const stored = localStorage.getItem("audiomind_auth");
      if (!stored) return {};
      return JSON.parse(stored) as AuthUser;
    } catch {
      return {};
    }
  };

  const user = getAuthUser();
  const displayName = user.name?.trim() || "User";
  const displayRole = user.role?.trim() || "Student";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

  const unreadCount = notifications.filter((n) => n.unread).length;

  const handleSignOut = () => {
    localStorage.removeItem("audiomind_auth");
    setProfileOpen(false);
    setNotifOpen(false);
    navigate("/");
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4 relative z-20">
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100"
      >
        <Menu size={20} />
      </button>

      {title && (
        <h1
          className="text-base font-semibold text-slate-900 hidden sm:block"
          style={{ fontFamily: "Outfit, sans-serif" }}
        >
          {title}
        </h1>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-sm ml-auto sm:ml-0">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          placeholder="Search sessions..."
          className="w-full pl-9 pr-4 py-2 text-[13px] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5B6EF8] focus:ring-2 focus:ring-[#5B6EF8]/10 text-slate-700 placeholder:text-slate-400"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              setProfileOpen(false);
            }}
            className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100"
          >
            <Bell size={19} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#5B6EF8] rounded-full" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
              <p className="text-[12px] font-semibold text-slate-500 px-4 pb-2 border-b border-slate-100">
                Notifications
              </p>

              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 hover:bg-slate-50 cursor-pointer ${
                    n.unread ? "bg-blue-50/50" : ""
                  }`}
                >
                  <p className="text-[13px] text-slate-700">{n.text}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{n.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotifOpen(false);
            }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl hover:bg-slate-100"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5B6EF8] to-[#7C3AED] flex items-center justify-center text-white text-[12px] font-semibold">
              {initials}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-[13px] font-medium text-slate-700 leading-tight">
                {displayName}
              </p>
              <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                {displayRole}
              </p>
            </div>

            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-[12px] font-semibold text-slate-700 truncate">
                  {displayName}
                </p>
                {user.email && (
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {user.email}
                  </p>
                )}
              </div>

              <Link
                to="/settings"
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50"
                onClick={() => setProfileOpen(false)}
              >
                <Settings size={15} className="text-slate-400" />
                Settings
              </Link>

              <hr className="my-1 border-slate-100" />

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50 text-left"
              >
                <LogOut size={15} />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Click away */}
      {(notifOpen || profileOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setNotifOpen(false);
            setProfileOpen(false);
          }}
        />
      )}
    </header>
  );
}
