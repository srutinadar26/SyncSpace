import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("syncspace_user");
    const token = localStorage.getItem("syncspace_token");

    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const persistSession = (token, userData) => {
    localStorage.setItem("syncspace_token", token);
    localStorage.setItem("syncspace_user", JSON.stringify(userData));
    setUser(userData);
  };

  const signup = async ({ name, email, password, role }) => {
    const { data } = await api.post("/auth/signup", { name, email, password, role });
    persistSession(data.token, data.user);
    return data.user;
  };

  const login = async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    persistSession(data.token, data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      // best-effort — clear local state regardless
    }
    localStorage.removeItem("syncspace_token");
    localStorage.removeItem("syncspace_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
