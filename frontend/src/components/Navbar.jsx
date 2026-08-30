import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2 font-semibold text-gray-900">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
          SyncSpace
        </Link>

        {user && (
          <div className="flex items-center gap-4">
            <Link to="/security" className="text-sm text-gray-500 hover:text-gray-700">
              Security
            </Link>
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs capitalize text-gray-500">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
