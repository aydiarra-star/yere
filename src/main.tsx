import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./jotcolis-interface.css";
import "./readable-type.css";
// Load the canonical app stylesheet last so premium component rules win the cascade.
import "./styles.css";
// Final, scoped homepage styling overrides: visual only, no business logic changes.
import "./home-priority-design.css";
// Final shared design tokens: JotColis-style readable typography and strict indigo identity.
import "./indigo-design-system.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// The service worker is enabled only for production builds served over HTTPS.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("YÉRÉ: impossible d’activer le mode hors ligne.", error);
    });
  });
}
