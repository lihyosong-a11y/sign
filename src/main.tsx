import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

const getRouterBasename = () => {
  const configuredUrl = import.meta.env.VITE_PUBLIC_APP_URL?.trim();
  if (!configuredUrl) return undefined;

  try {
    const url = new URL(configuredUrl);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (!pathname || pathname === "/") return undefined;

    const isConfiguredHost = window.location.origin === url.origin;
    const isAlreadyUnderBasePath = window.location.pathname === pathname || window.location.pathname.startsWith(`${pathname}/`);
    return isConfiguredHost || isAlreadyUnderBasePath ? pathname : undefined;
  } catch {
    return undefined;
  }
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={getRouterBasename()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
