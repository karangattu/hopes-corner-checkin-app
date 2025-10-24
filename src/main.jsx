import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles.css";
import "./App.css";
import App from "./App.jsx";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    <Toaster 
      position="top-center" 
      toastOptions={{ 
        duration: 2000,
        success: { duration: 1500 },
        error: { duration: 4000 },
      }} 
    />
  </StrictMode>,
);
