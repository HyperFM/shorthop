import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

function removeSplash() {
  const splash = document.getElementById('sh-splash');
  if (splash) {
    splash.classList.add('fade-out');
    setTimeout(() => splash.remove(), 600);
  }
}

const root = document.getElementById("root")!;

try {
  createRoot(root).render(<App />);
  setTimeout(removeSplash, 1500);
} catch (e) {
  console.error('App failed to mount:', e);
  removeSplash();
  root.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;flex-direction:column;gap:16px;padding:20px;text-align:center"><h2>Something went wrong</h2><p>Please close and reopen the app.</p><button onclick="location.reload()" style="padding:12px 24px;background:#f97316;color:white;border:none;border-radius:12px;font-weight:bold;font-size:16px;cursor:pointer">Reload</button></div>';
}
