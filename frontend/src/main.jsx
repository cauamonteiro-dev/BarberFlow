import React from "react";
import { createRoot } from "react-dom/client";
import App from "./AuthShell.jsx";
import ShowcasePreview from "./ShowcasePreview.jsx";
import ShopOnboarding from "./ShopOnboarding.jsx";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/manrope";
import "./style.css";
import "./portal.css";
const onboarding =
  new URLSearchParams(window.location.search).get("pagina") === "sua-barbearia";
const page =
  window.self !== window.top ? (
    <ShowcasePreview />
  ) : onboarding ? (
    <ShopOnboarding />
  ) : (
    <App />
  );

createRoot(document.getElementById("root")).render(
  <React.StrictMode>{page}</React.StrictMode>,
);

import "./mobile.css";
import "./login-hero.css";
