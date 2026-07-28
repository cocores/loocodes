import { useRef, useState } from "react";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { bathroomType, type Bathroom } from "../types";
import { CodeBadge } from "../components/Badges";
import { AboutView, NotificationPrefsView, PrivacySettingsView } from "./SettingsViews";
import "./ProfileView.css";

const EMOJIS = [
  "😀", "😎", "🤓", "🧑", "👩", "🧔", "👨‍💻", "🧕", "🦸", "🧙",
  "🐶", "🦊", "🐱", "🐨", "🐼", "🦋", "🌊", "🏔", "🌟", "🔑",
  "🚽", "🚻", "🗝", "🪠", "💧", "🏠", "📍", "⭐", "🎯", "🛡",
];

type Screen = "profile" | "notifications" | "privacy" | "about";

export function ProfileView() {
  const { myCodes } = useBathroomStore();
  const [screen, setScreen] = useState<Screen>("profile");
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [avatarImage, setAvatarImage] = useState<string | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalUpvotes = myCodes.reduce((sum, b) => sum + b.upvoteCount, 0);
  const verifiedCount = myCodes.filter((b) => b.isVerified).length;

  const onFileChosen = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarImage(reader.result as string);
      setAvatarEmoji(null);
    };
    reader.readAsDataURL(file);
  };

  if (screen === "notifications") {
    return <NotificationPrefsView onBack={() => setScreen("profile")} />;
  }
  if (screen === "privacy") {
    return <PrivacySettingsView onBack={() => setScreen("profile")} />;
  }
  if (screen === "about") {
    return <AboutView onBack={() => setScreen("profile")} />;
  }

  return (
    <div className="screen profile-view">
      <header className="profile-view__header">
        <h1>Profile</h1>
      </header>

      <div className="profile-view__body">
        <button type="button" className="profile-view__avatar-btn" onClick={() => setShowPhotoOptions(true)}>
          <div className="profile-view__avatar">
            {avatarImage ? (
              <img src={avatarImage} alt="Avatar" />
            ) : avatarEmoji ? (
              <span className="profile-view__avatar-emoji">{avatarEmoji}</span>
            ) : (
              <span className="profile-view__avatar-placeholder">👤</span>
            )}
          </div>
          <span className="profile-view__avatar-edit">✎</span>
        </button>

        <div className="profile-view__handle">@loocodes_user</div>

        <div className="profile-view__stats">
          <StatBubble value={myCodes.length} label="Shared" />
          <div className="profile-view__divider" />
          <StatBubble value={totalUpvotes} label="Upvotes" />
          <div className="profile-view__divider" />
          <StatBubble value={verifiedCount} label="Verified" />
        </div>

        <section className="profile-view__section">
          <h2>My Codes</h2>
          {myCodes.length === 0 ? (
            <p className="profile-view__empty">You haven't shared any codes yet.</p>
          ) : (
            <div className="profile-view__codes">
              {myCodes.map((b) => (
                <MyCodeCard key={b.id} bathroom={b} />
              ))}
            </div>
          )}
        </section>

        <div className="profile-view__settings">
          <SettingsRow icon="🔔" label="Notification preferences" onClick={() => setScreen("notifications")} />
          <div className="profile-view__settings-divider" />
          <SettingsRow icon="🔒" label="Privacy settings" onClick={() => setScreen("privacy")} />
          <div className="profile-view__settings-divider" />
          <SettingsRow icon="ℹ️" label="About LooCodes" onClick={() => setScreen("about")} />
        </div>
      </div>

      {showPhotoOptions && (
        <div className="action-sheet-backdrop" onClick={() => setShowPhotoOptions(false)}>
          <div className="action-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="action-sheet__title">Change Photo</div>
            <button
              type="button"
              className="action-sheet__option"
              onClick={() => {
                setShowPhotoOptions(false);
                fileInputRef.current?.click();
              }}
            >
              Photo Library
            </button>
            <button
              type="button"
              className="action-sheet__option"
              onClick={() => {
                setShowPhotoOptions(false);
                setShowEmojiPicker(true);
              }}
            >
              Choose Emoji
            </button>
            {(avatarImage || avatarEmoji) && (
              <button
                type="button"
                className="action-sheet__option action-sheet__option--destructive"
                onClick={() => {
                  setAvatarImage(null);
                  setAvatarEmoji(null);
                  setShowPhotoOptions(false);
                }}
              >
                Reset to Default
              </button>
            )}
            <button
              type="button"
              className="action-sheet__cancel"
              onClick={() => setShowPhotoOptions(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => onFileChosen(e.target.files?.[0])}
      />

      {showEmojiPicker && (
        <div className="sheet-backdrop" onClick={() => setShowEmojiPicker(false)}>
          <div className="sheet emoji-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet__drag-indicator" />
            <div className="emoji-sheet__header">
              <span>Choose Avatar</span>
              <button type="button" onClick={() => setShowEmojiPicker(false)}>
                Cancel
              </button>
            </div>
            <div className="emoji-sheet__grid">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="emoji-sheet__emoji"
                  onClick={() => {
                    setAvatarEmoji(e);
                    setAvatarImage(null);
                    setShowEmojiPicker(false);
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBubble({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat-bubble">
      <div className="stat-bubble__value">{value}</div>
      <div className="stat-bubble__label">{label}</div>
    </div>
  );
}

function MyCodeCard({ bathroom }: { bathroom: Bathroom }) {
  const info = bathroomType(bathroom.type);
  return (
    <div className="my-code-card">
      <div className="my-code-card__icon">{info.emoji}</div>
      <div className="my-code-card__info">
        <div className="my-code-card__name">{bathroom.name}</div>
        <div className="my-code-card__address">{bathroom.address}</div>
      </div>
      <div className="my-code-card__right">
        <CodeBadge code={bathroom.code} isFreeNoCode={bathroom.isFree && !bathroom.code} />
        {bathroom.isVerified && <span className="my-code-card__verified">✓</span>}
      </div>
    </div>
  );
}

function SettingsRow({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" className="settings-row" onClick={onClick}>
      <span className="settings-row__icon">{icon}</span>
      <span className="settings-row__label">{label}</span>
      <span className="settings-row__chevron">›</span>
    </button>
  );
}
