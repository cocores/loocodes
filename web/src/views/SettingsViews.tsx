import { useState, type ReactNode } from "react";
import { useAuth } from "../store/AuthContext";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { Switch } from "../components/Switch";
import "./SettingsViews.css";

// Curated open-data coverage only — a static snapshot of the seed datasets
// in store/seed.ts, not a live query. User-submitted codes exist well
// outside this list (most have no real city attached, just "Shared
// location"), so this is "where we have a real base layer," not "every
// place LooCodes works."
const CITIES_AVAILABLE: { region: string; cities: { name: string; count: number }[] }[] = [
  {
    region: "North America",
    cities: [
      { name: "New York City, NY", count: 50 },
      { name: "Washington, D.C.", count: 22 },
      { name: "Kansas City, KS & MO", count: 31 },
      { name: "St. Louis, MO", count: 16 },
      { name: "Denver, CO", count: 20 },
      { name: "Los Angeles, CA", count: 26 },
      { name: "San Francisco, CA", count: 16 },
      { name: "Miami, FL", count: 20 },
      { name: "Mexico City, Mexico", count: 12 },
      { name: "Toronto, Canada", count: 19 },
    ],
  },
  {
    region: "Europe",
    cities: [
      { name: "London, UK", count: 18 },
      { name: "Paris, France", count: 20 },
      { name: "Berlin, Germany", count: 24 },
      { name: "Rome, Italy", count: 11 },
      { name: "Barcelona, Spain", count: 12 },
      { name: "Lisbon, Portugal", count: 5 },
      { name: "Athens, Greece", count: 4 },
    ],
  },
];

interface SubScreenProps {
  onBack: () => void;
}

function ScreenHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="sub-screen__header">
      <button type="button" className="sub-screen__back" onClick={onBack}>
        ‹ Back
      </button>
      <span className="sub-screen__title">{title}</span>
      <span className="sub-screen__spacer" />
    </header>
  );
}

type PermType = "location" | "notification";

const PERMISSION_INFO: Record<PermType, { title: string; icon: string; body: string }> = {
  location: {
    title: "Allow Location Access",
    icon: "📍",
    body: "LooCodes uses your location to alert you when new bathroom codes are shared nearby.",
  },
  notification: {
    title: "Allow Notifications",
    icon: "🔔",
    body: "LooCodes will notify you when your shared codes receive upvotes or are flagged as stale.",
  },
};

export function NotificationPrefsView({ onBack }: SubScreenProps) {
  // Persisted on this account's Firestore profile (notificationPrefs) rather
  // than local-only state — these used to just reset to off every time this
  // screen was reopened, which made them look broken even when "on."
  const { notificationPrefs: prefs, updateNotificationPrefs } = useAuth();
  const [pendingPerm, setPendingPerm] = useState<PermType | null>(null);

  const resolvePermission = (granted: boolean) => {
    if (pendingPerm === "location") void updateNotificationPrefs({ nearbyNew: granted });
    if (pendingPerm === "notification") {
      void updateNotificationPrefs({ codeVerified: granted, codeFlagged: granted });
    }
    setPendingPerm(null);
  };

  return (
    <div className="screen sub-screen">
      <ScreenHeader title="Notifications" onBack={onBack} />
      <div className="sub-screen__body">
        <SettingsSection title="Nearby">
          <ToggleRow
            label="New codes near me"
            checked={prefs.nearbyNew}
            onChange={(v) =>
              v ? setPendingPerm("location") : void updateNotificationPrefs({ nearbyNew: false })
            }
          />
          <ToggleRow
            label="Weekly digest"
            checked={prefs.weeklyDigest}
            onChange={(v) => void updateNotificationPrefs({ weeklyDigest: v })}
          />
        </SettingsSection>

        <SettingsSection title="My Codes">
          <ToggleRow
            label="Code verified"
            checked={prefs.codeVerified}
            onChange={(v) =>
              v ? setPendingPerm("notification") : void updateNotificationPrefs({ codeVerified: false })
            }
          />
          <ToggleRow
            label="Code flagged"
            checked={prefs.codeFlagged}
            onChange={(v) =>
              v ? setPendingPerm("notification") : void updateNotificationPrefs({ codeFlagged: false })
            }
          />
          <ToggleRow
            label="Suggestions on my codes"
            checked={prefs.suggestions}
            onChange={(v) => void updateNotificationPrefs({ suggestions: v })}
          />
        </SettingsSection>

        <SettingsSection title="Schedule">
          <ToggleRow
            label="Quiet hours (10 PM – 8 AM)"
            checked={prefs.quietHours}
            onChange={(v) => void updateNotificationPrefs({ quietHours: v })}
          />
        </SettingsSection>
      </div>

      {pendingPerm && <PermissionSheet perm={pendingPerm} onDecide={resolvePermission} />}
    </div>
  );
}

export function PrivacySettingsView({ onBack }: SubScreenProps) {
  const { deleteAccount, error } = useAuth();
  const [preciseLocation, setPreciseLocation] = useState(true);
  const [backgroundLocation, setBackgroundLocation] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [personalized, setPersonalized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const confirmDelete = async () => {
    // On success, Firebase's auth-state listener fires and AuthGate (in
    // App.tsx) swaps straight to LoginView — no onBack() needed. On
    // failure, the error message below stays visible on this same screen.
    await deleteAccount();
    setShowDeleteConfirm(false);
  };

  return (
    <div className="screen sub-screen">
      <ScreenHeader title="Privacy" onBack={onBack} />
      <div className="sub-screen__body">
        <SettingsSection title="Location">
          <ToggleRow label="Precise location" checked={preciseLocation} onChange={setPreciseLocation} />
          <ToggleRow
            label="Background location"
            checked={backgroundLocation}
            onChange={setBackgroundLocation}
          />
        </SettingsSection>

        <SettingsSection title="Data & Personalization">
          <ToggleRow label="Anonymous analytics" checked={analytics} onChange={setAnalytics} />
          <ToggleRow label="Personalized suggestions" checked={personalized} onChange={setPersonalized} />
        </SettingsSection>

        <button
          type="button"
          className="sub-screen__destructive"
          onClick={() => setShowDeleteConfirm(true)}
        >
          🗑 Delete Account
        </button>
        {error && <p className="sub-screen__footer" style={{ color: "var(--flag)" }}>⚠ {error}</p>}
        <p className="sub-screen__footer">
          LooCodes never sells your data. Location is used only to find nearby bathrooms.
        </p>
      </div>

      {showDeleteConfirm && (
        <div className="alert-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="alert" onClick={(e) => e.stopPropagation()}>
            <div className="alert__title">Delete Account?</div>
            <div className="alert__message">
              This permanently deletes your LooCodes account and sign-in. Codes you've already
              shared stay public for others to use — they just won't show under "My Codes" for
              you anymore, since you won't be signed in to see them.
            </div>
            <div className="alert__actions">
              <button type="button" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="alert__destructive" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function AboutView({ onBack }: SubScreenProps) {
  const { bathrooms } = useBathroomStore();
  const totalCities = CITIES_AVAILABLE.reduce((sum, r) => sum + r.cities.length, 0);

  return (
    <div className="screen sub-screen">
      <ScreenHeader title="About LooCodes" onBack={onBack} />
      <div className="sub-screen__body">
        <SettingsSection title="Why LooCodes">
          <div className="about-story">
            <p>
              Most bathrooms worth knowing about aren't actually open to the public — they're
              locked behind a code only employees, regulars, or paying customers ever learn. If
              you don't already have it, you're stuck even standing right outside the door.
            </p>
            <p>
              LooCodes started as a simple idea: people who already know a code can share it with
              people who need one right now. It's grown into a crowdsourced map of bathroom
              access — shared codes, free public restrooms, and everything in between — kept
              accurate by the same community that uses it.
            </p>
            <p>
              Every listing can be reconfirmed with a tap or flagged as stale by anyone nearby, so
              the map keeps working as codes change, places close, and new ones open.
            </p>
            <p>
              <strong>Our objective:</strong> make finding a working bathroom as easy as checking
              a map, anywhere in the world, for free — no tracking down an employee, no buying
              something you didn't want just to get a door code.
            </p>
          </div>
        </SettingsSection>

        <SettingsSection title="App Info">
          <InfoRow label="Version" value="1.0.0 (1)" />
          <InfoRow label="Bathrooms indexed" value={bathrooms.length.toLocaleString()} />
          <InfoRow label="Cities with curated coverage" value={String(totalCities)} />
        </SettingsSection>

        <SettingsSection title="Cities Available">
          {CITIES_AVAILABLE.map((region) => (
            <div key={region.region} className="about-region">
              <div className="about-region__title">{region.region}</div>
              {region.cities.map((city) => (
                <InfoRow key={city.name} label={city.name} value={`${city.count} locations`} />
              ))}
            </div>
          ))}
        </SettingsSection>

        <SettingsSection title="Legal">
          <LinkRow icon="📄" label="Terms of Service" href="https://loocodes.vercel.app/terms" />
          <LinkRow icon="🤚" label="Privacy Policy" href="https://loocodes.vercel.app/privacy" />
          <LinkRow icon="{ }" label="Open Source Licenses" href="https://loocodes.vercel.app/licenses" />
        </SettingsSection>

        <SettingsSection title="Support">
          <LinkRow icon="✉️" label="Contact Us" href="mailto:hello@loocodes.app" />
          <LinkRow icon="⭐" label="Rate on App Store" href="https://apps.apple.com" />
        </SettingsSection>
      </div>
    </div>
  );
}

export function PermissionSheet({
  perm,
  onDecide,
}: {
  perm: PermType;
  onDecide: (granted: boolean) => void;
}) {
  const info = PERMISSION_INFO[perm];
  return (
    <div className="sheet-backdrop" onClick={() => onDecide(false)}>
      <div className="sheet permission-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet__drag-indicator" />
        <div className="permission-sheet__body">
          <div className="permission-sheet__icon">{info.icon}</div>
          <div className="permission-sheet__title">{info.title}</div>
          <p className="permission-sheet__text">{info.body}</p>
          <div className="permission-sheet__actions">
            <button type="button" className="permission-sheet__allow" onClick={() => onDecide(true)}>
              Allow
            </button>
            <button type="button" className="permission-sheet__deny" onClick={() => onDecide(false)}>
              Don't Allow
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-section">
      <div className="settings-section__title">{title}</div>
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <Switch checked={checked} onChange={onChange} />
    </label>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <span className="info-row__value">{value}</span>
    </div>
  );
}

function LinkRow({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a className="link-row" href={href} target="_blank" rel="noopener noreferrer">
      <span className="link-row__icon">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
