import React from "react";
import { createRoot } from "react-dom/client";
import App from "./AuthShell.jsx";
import ShowcasePreview from "./ShowcasePreview.jsx";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./style.css";
import "./portal.css";
createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {window.self === window.top ? <App /> : <ShowcasePreview />}
  </React.StrictMode>,
);

import "./mobile.css";
import "./login-hero.css";
