import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import "./styles/datepicker.css";
import { LoadingProvider } from "./context/LoadingContext.jsx";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <LoadingProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LoadingProvider>
  </React.StrictMode>
);

// Remove initial loader after React mounts
window.addEventListener("load", () => {
  const loader = document.getElementById("initial-loader");
  if (loader) {
    loader.style.opacity = "0";
    setTimeout(() => loader.remove(), 500); // fade out before removing
  }
});
