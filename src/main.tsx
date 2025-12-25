<<<<<<< Updated upstream
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import 'file-icons-js/css/style.css';
=======
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'
// file-icons-js removed - using local SVG icons instead
>>>>>>> Stashed changes

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
