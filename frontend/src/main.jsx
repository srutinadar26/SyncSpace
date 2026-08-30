import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { getInitialTheme, applyTheme } from "./theme";
import "./index.css";

// Applied before React mounts so there's no flash of the wrong theme.
applyTheme(getInitialTheme());

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
