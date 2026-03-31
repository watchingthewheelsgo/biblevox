import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AppI18nProvider } from "./i18n/provider";
import "../index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppI18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppI18nProvider>
  </StrictMode>,
);
