import { useState, type ReactNode } from "react";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { Switch } from "../components/Switch";
import "./SettingsViews.css";

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
  const [nearbyNew, setNearbyNew] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeFlagged, setCodeFlagged] = useState(false);
  const [quietHours, setQuietHours] = useState(false);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [comments, setComments] = useState(false);
  const [pendingPerm, setPendingPerm] = useState<PermType | null>(null);

  const resolvePermission = (granted: boolean) => {
    if (pendingPerm === "location") setNearbyNew(granted);
    if (pendingPerm === "notification") {
      setCodeVerified(granted);
      setCodeFlagged(granted);
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
            checked={nearbyNew}
            onChange={(v) => (v ? setPendingPerm("location") : setNearbyNew(false))}
          />
          <ToggleRow label="Weekly digest" checked={weeklyDigest} onChange={setWeeklyDigest} />
        </SettingsSection>

        <SettingsSection title="My Codes">
          <ToggleRow
            label="Code verified"
            checked={codeVerified}
            onChange={(v) => (v ? setPendingPerm("notification") : setCodeVerified(false))}
          />
          <ToggleRow
            label="Code flagged"
            checked={codeFlagged}
            onChange={(v) => (v ? setPendingPerm("notification") : setCodeFlagged(false))}
          />
          <ToggleRow label="Comments on my codes" checked={comments} onChange={setComments} />
        </SettingsSection>

        <SettingsSection title="Schedule">
          <ToggleRow label="Quiet hours (10 PM – 8 AM)" checked={quietHours} onChange={setQuietHours} />
        </SettingsSection>
      </div>

      {pendingPerm && <PermissionSheet perm={pendingPerm} onDecide={resolvePermission} />}
    </div>
  );
}

export function PrivacySettingsView({ onBack }: SubScreenProps) {
  const { resetAccount } = useBathroomStore();
  const [preciseLocation, setPreciseLocation] = useState(true);
  const [backgroundLocation, setBackgroundLocation] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [personalized, setPersonalized] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const confirmDelete = () => {
    resetAccount();
    setShowDeleteConfirm(false);
    onBack();
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
        <p className="sub-screen__footer">
          LooCodes never sells your data. Location is used only to find nearby bathrooms.
        </p>
      </div>

      {showDeleteConfirm && (
        <div className="alert-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="alert" onClick={(e) => e.stopPropagation()}>
            <div className="alert__title">Delete Account?</div>
            <div className="alert__message">
              This resets your account on this device. Codes you've already shared stay public
              for others to use — they just won't show under "My Codes" anymore.
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
  return (
    <div className="screen sub-screen">
      <ScreenHeader title="About LooCodes" onBack={onBack} />
      <div className="sub-screen__body">
        <SettingsSection title="App Info">
          <InfoRow label="Version" value="1.0.0 (1)" />
          <InfoRow label="Bathrooms indexed" value="12,847" />
          <InfoRow label="Cities covered" value="284" />
        </SettingsSection>

        <SettingsSection title="Legal">
          <LinkRow icon="📄" label="Terms of Service" href="https://loocodes.app/terms" />
          <LinkRow icon="🤚" label="Privacy Policy" href="https://loocodes.app/privacy" />
          <LinkRow icon="{ }" label="Open Source Licenses" href="https://loocodes.app/licenses" />
        </SettingsSection>

        <SettingsSection title="Support">
          <LinkRow icon="✉️" label="Contact Us" href="mailto:hello@loocodes.app" />
          <LinkRow icon="⭐" label="Rate on App Store ⭐" href="https://apps.apple.com" />
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
