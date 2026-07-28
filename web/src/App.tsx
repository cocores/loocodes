import { useState } from "react";
import { BathroomStoreProvider, useBathroomStore } from "./store/BathroomStoreContext";
import { ShareView } from "./views/ShareView";
import { BathroomListView } from "./views/BathroomListView";
import { ProfileView } from "./views/ProfileView";
import "./App.css";

type Tab = "share" | "nearby" | "profile";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "share", label: "Share", icon: "➕" },
  { id: "nearby", label: "Nearby", icon: "📋" },
  { id: "profile", label: "Profile", icon: "👤" },
];

function App() {
  const [tab, setTab] = useState<Tab>("nearby");

  return (
    <BathroomStoreProvider>
      <div className="app">
        <OfflineBanner />
        <main className="app__content">
          <div style={{ display: tab === "share" ? "block" : "none" }}>
            <ShareView onViewList={() => setTab("nearby")} />
          </div>
          <div style={{ display: tab === "nearby" ? "block" : "none" }}>
            <BathroomListView />
          </div>
          <div style={{ display: tab === "profile" ? "block" : "none" }}>
            <ProfileView />
          </div>
        </main>

        <nav className="app__tabbar">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`app__tab ${tab === t.id ? "app__tab--active" : ""}`}
              onClick={() => setTab(t.id)}
            >
              <span className="app__tab-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </BathroomStoreProvider>
  );
}

function OfflineBanner() {
  const { isOffline } = useBathroomStore();
  if (!isOffline) return null;
  return (
    <div className="app__offline-banner">
      Public sharing isn't set up yet — codes are only saved in this browser. See{" "}
      <code>web/README.md</code> for KV setup.
    </div>
  );
}

export default App;
