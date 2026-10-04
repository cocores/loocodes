import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./store/AuthContext";
import { BathroomStoreProvider, useBathroomStore } from "./store/BathroomStoreContext";
import type { Coordinate } from "./hooks/useLocation";
import { LoginView } from "./views/LoginView";
import { ShareView } from "./views/ShareView";
import { BathroomListView } from "./views/BathroomListView";
import { ProfileView } from "./views/ProfileView";
import { PrivacyView, TermsView } from "./views/LegalView";
import "./App.css";

type Tab = "share" | "nearby" | "profile";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "share", label: "Share", icon: "➕" },
  { id: "nearby", label: "Nearby", icon: "📋" },
  { id: "profile", label: "Profile", icon: "👤" },
];

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public — no sign-in required, since App Store/Play Store listings
              and a signed-out visitor both need to be able to open these. */}
          <Route path="/terms" element={<TermsView />} />
          <Route path="/privacy" element={<PrivacyView />} />
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/*" element={<ProtectedRoute />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoadingScreen() {
  return (
    <div className="screen app__loading">
      <div className="app__spinner" />
    </div>
  );
}

// The app requires a signed-in account now — there's no more anonymous/
// no-login mode. /login is its own route (not just a conditionally-rendered
// view at "/") so it has a real, linkable/bookmarkable URL distinct from the
// app itself, and so the browser's back button, Google's redirect-back
// target, and a direct refresh all behave the way a normal page would.
function LoginRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  return <LoginView />;
}

function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return (
    <BathroomStoreProvider>
      <MainApp />
    </BathroomStoreProvider>
  );
}

function MainApp() {
  const [tab, setTab] = useState<Tab>("nearby");
  const [prefillLocation, setPrefillLocation] = useState<Coordinate | null>(null);

  return (
    <div className="app">
      <OfflineBanner />
      <main className="app__content">
        <div style={{ display: tab === "share" ? "block" : "none" }}>
          <ShareView onViewList={() => setTab("nearby")} prefillLocation={prefillLocation} />
        </div>
        <div style={{ display: tab === "nearby" ? "block" : "none" }}>
          <BathroomListView
            onAddAtLocation={(coordinate) => {
              setPrefillLocation(coordinate);
              setTab("share");
            }}
          />
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
  );
}

function OfflineBanner() {
  const { isOffline } = useBathroomStore();
  if (!isOffline) return null;
  return (
    <div className="app__offline-banner">
      Public sharing isn't set up yet — codes are only saved in this browser. See{" "}
      <code>web/README.md</code> for Firebase setup.
    </div>
  );
}

export default App;
