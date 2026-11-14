import { useEffect, useState } from "react";

const key = "barberflow.theme";
function savedTheme() {
  try {
    const value = localStorage.getItem(key);
    return value === "dark" || value === "light" ? value : null;
  } catch {
    return null;
  }
}
const systemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

export function useTheme() {
  const [preference, setPreference] = useState(savedTheme);
  const [theme, setTheme] = useState(
    () =>
      document.documentElement.dataset.theme || savedTheme() || systemTheme(),
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      if (!preference) setTheme(media.matches ? "dark" : "light");
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [preference]);
  useEffect(() => {
    const synchronize = (event) => {
      if (event.key !== key && event.key !== null) return;
      const value = savedTheme();
      setPreference(value);
      setTheme(value || systemTheme());
    };
    window.addEventListener("storage", synchronize);
    return () => window.removeEventListener("storage", synchronize);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0c141e" : "#f6f4f0");
  }, [theme]);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setPreference(next);
    setTheme(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      /* The theme still works when storage is unavailable. */
    }
  }
  return { theme, toggleTheme };
}
