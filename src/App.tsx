import { listen } from "@tauri-apps/api/event";
import { useEffect } from "react";
import { HashRouter, Route, Routes, useNavigate } from "react-router-dom";
import { CommandPalette } from "./components/CommandPalette";
import { TitleBar } from "./components/TitleBar";
import { Toasts } from "./components/ui";
import { api } from "./lib/api";
import { setNavigator } from "./lib/actions";
import { useStore } from "./lib/store";
import Dashboard from "./pages/Dashboard";
import ProjectPage from "./pages/ProjectPage";
import Settings from "./pages/Settings";

function Shell() {
  const navigate = useNavigate();
  const init = useStore((s) => s.init);
  const setUpdate = useStore((s) => s.setUpdate);

  useEffect(() => {
    setNavigator(navigate);
  }, [navigate]);

  useEffect(() => {
    const un = listen<{ provider: string; state: string; message: string }>("local-ai", (e) => {
      const { state, message } = e.payload;
      if (state === "started") useStore.getState().toast({ kind: "success", title: message, detail: "Local AI is ready." });
      if (state === "failed") useStore.getState().toast({ kind: "error", title: "Local AI is not available", detail: message });
    });
    return () => void un.then((f) => f());
  }, []);

  useEffect(() => {
    void init().then(() => {
      if ((useStore.getState().settings.autoUpdate ?? "true") !== "true") return;
      api
        .checkUpdate()
        .then((r) => r.available && setUpdate({ latest: r.latest, downloadUrl: r.downloadUrl }))
        .catch(() => undefined);
    });
  }, [init, setUpdate]);

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <main className="min-h-0 flex-1">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/project/:id" element={<ProjectPage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
      <CommandPalette />
      <Toasts />
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}
