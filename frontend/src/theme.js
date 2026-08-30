const STORAGE_KEY = "syncspace_theme";

export const getInitialTheme = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const applyTheme = (theme) => {
  document.documentElement.classList.toggle("dark", theme === "dark");
};

export const setTheme = (theme) => {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
};
