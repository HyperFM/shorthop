import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function dismissPreloader() {
  const el = document.getElementById("sh-preloader");
  if (!el) return;
  el.classList.add("fade-out");
  setTimeout(() => el.remove(), 600);
}

window.__dismissPreloader = dismissPreloader;

createRoot(document.getElementById("root")!).render(<App />);
