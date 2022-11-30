import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("menu") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
