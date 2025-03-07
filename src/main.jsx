import React from "react"; // Add this if missing
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { BrowserRouter, BrowserRouter as Router } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <React.StrictMode>
      <App />
    </React.StrictMode>
  </BrowserRouter>
);
