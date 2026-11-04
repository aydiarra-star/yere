import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AuthGate from "./AuthGate";
import PublicMarket from "./PublicMarket";
import "@fontsource-variable/manrope";
import "@fontsource/cormorant-garamond/700.css";
import "./jotcolis-interface.css";
import "./readable-type.css";
import "./styles.css";
import "./home-priority-design.css";
import "./indigo-design-system.css";
import "./premium-atelier.css";
import "./marketplace-harmony.css";
import "./yere-global-harmony.css";
import "./mobile-viewport-fix.css";

// Public storefront is the default entry point. The professional atelier space
// remains available explicitly at /atelier and keeps its existing authentication.
const isProfessionalEntry = window.location.pathname === "/atelier" || window.location.pathname.startsWith("/atelier/") || new URLSearchParams(window.location.search).get("espace") === "professionnel";
const isAtelierApp = isProfessionalEntry;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isAtelierApp ? <AuthGate initialProfessionalLogin><App /></AuthGate> : <PublicMarket />}
  </React.StrictMode>
);

// Offline caching is reserved for the authenticated atelier application.
if (isAtelierApp && import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch((error) => {
      console.error("YÉRÉ: impossible d’activer le mode hors ligne.", error);
    });
  });
}
