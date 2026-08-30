import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
          SyncSpace
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/security" className="hidden text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 sm:inline">
              Security
            </Link>
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
              <p className="text-xs capitalize text-gray-500 dark:text-gray-400">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Log out
            </button>
          </div>
        )}
      </div>

      {/* Compact secondary row on small screens for links hidden above */}
      {user && (
        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 px-4 py-1.5 sm:hidden">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {user.name} · <span className="capitalize">{user.role}</span>
          </span>
          <Link to="/security" className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
            Security
          </Link>
        </div>
      )}
    </header>
  );
}
