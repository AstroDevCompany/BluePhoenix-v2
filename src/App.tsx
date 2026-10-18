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
