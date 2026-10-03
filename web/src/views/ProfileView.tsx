import { useRef, useState } from "react";
import { useAuth } from "../store/AuthContext";
import { useBathroomStore } from "../store/BathroomStoreContext";
import { bathroomType, type Bathroom } from "../types";
import { CodeBadge } from "../components/Badges";
import { resizeImageToDataUrl } from "../lib/image";
import { AboutView, NotificationPrefsView, PrivacySettingsView } from "./SettingsViews";
import { AdminFlaggedView } from "./AdminFlaggedView";
import "./ProfileView.css";

const EMOJIS = [
  "😀", "😎", "🤓", "🧑", "👩", "🧔", "👨‍💻", "🧕", "🦸", "🧙",
  "🐶", "🦊", "🐱", "🐨", "🐼", "🦋", "🌊", "🏔", "🌟", "🔑",
  "🚽", "🚻", "🗝", "🪠", "💧", "🏠", "📍", "⭐", "🎯", "🛡",
];

// A lightweight stand-in for real contributor reputation — not derived from
// anything the account controls (upvotes/flags on its own submissions), but
// still just a rough badge, not a verified trust system.
const TRUSTED_CONTRIBUTOR_THRESHOLD = 10;

type Screen = "profile" | "notifications" | "privacy" | "about" | "flagged";

export function ProfileView() {
  const { myCodes, bathrooms, votedUpIds, flaggedIds } = useBathroomStore();
  const {
    user,
    signOut,
    notificationPrefs,
    avatar,
    setAvatarPhoto,
    setAvatarEmoji,
    clearAvatar,
  } = useAuth();
  const [screen, setScreen] = useState<Screen>("profile");
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    void signOut();
  };

  const totalUpvotes = myCodes.reduce((sum, b) => sum + b.upvoteCount, 0);
  const totalFlags = myCodes.reduce((sum, b) => sum + b.flagCount, 0);
  const verifiedCount = myCodes.filter((b) => b.isVerified).length;
  const isTrustedContributor =
    myCodes.length > 0 && totalUpvotes - totalFlags * 2 >= TRUSTED_CONTRIBUTOR_THRESHOLD;
  const flaggedCount = bathrooms.filter((b) => b.flagCount > 0).length;

  // What this account has submitted — a "code" is a listing someone needs an
  // actual code for; everything else (free public restrooms, etc.) is just a
  // shared location.
  const codesAddedCount = myCodes.filter((b) => b.code.trim() !== "").length;
  const locationsAddedCount = myCodes.length - codesAddedCount;
  // What this account has *done* elsewhere, as opposed to received on its
  // own submissions above — derived the same way the shared "✓ Works!"/
  // flagged display is (each bathroom's own voters/flaggers arrays), not
  // tracked separately, so it stays consistent across devices.
  const confirmedByMeCount = votedUpIds.size;
  const flaggedByMeCount = flaggedIds.size;

  const onFileChosen = async (file: File | undefined) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      // Resized/compressed before it ever touches state or Firestore — a
      // full-resolution phone photo read as-is can be several MB, far past
      // what's sane for a profile avatar or a Firestore document field.
      const dataUrl = await resizeImageToDataUrl(file);
      await setAvatarPhoto(dataUrl);
    } catch (err) {
      console.error("Failed to set avatar photo", err);
    } finally {
      setIsUploadingPhoto(false);
    }
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
  if (screen === "flagged") {
    return <AdminFlaggedView onBack={() => setScreen("profile")} />;
  }

  return (
    <div className="screen profile-view">
      <header className="profile-view__header">
        <h1>Profile</h1>
      </header>

      <div className="profile-view__body">
        <button type="button" className="profile-view__avatar-btn" onClick={() => setShowPhotoOptions(true)}>
          <div className="profile-view__avatar">
            {avatar.avatarPhoto ? (
              <img src={avatar.avatarPhoto} alt="Avatar" />
            ) : avatar.avatarEmoji ? (
              <span className="profile-view__avatar-emoji">{avatar.avatarEmoji}</span>
            ) : (
              <span className="profile-view__avatar-placeholder">👤</span>
            )}
            {isUploadingPhoto && <span className="profile-view__avatar-spinner" />}
          </div>
          <span className="profile-view__avatar-edit">✎</span>
        </button>

        <div className="profile-view__handle">{user?.displayName || user?.email || "LooCodes User"}</div>
        {isTrustedContributor && (
          <div className="profile-view__trusted-badge">🌟 Trusted Contributor</div>
        )}

        <div className="profile-view__stats">
          <StatBubble value={codesAddedCount} label="Codes Added" />
          <div className="profile-view__divider" />
          <StatBubble value={locationsAddedCount} label="Locations Added" />
          <div className="profile-view__divider" />
          <StatBubble value={verifiedCount} label="Verified" />
        </div>

        <div className="profile-view__stats">
          <StatBubble value={totalUpvotes} label="Upvotes" />
          <div className="profile-view__divider" />
          <StatBubble value={confirmedByMeCount} label="Marked Working" />
          <div className="profile-view__divider" />
          <StatBubble value={flaggedByMeCount} label="Flagged" />
        </div>

        <section className="profile-view__section">
          <h2>My Codes</h2>
          {myCodes.length === 0 ? (
            <p className="profile-view__empty">You haven't shared any codes yet.</p>
          ) : (
            <div className="profile-view__codes">
              {myCodes.map((b) => (
                <MyCodeCard
                  key={b.id}
                  bathroom={b}
                  showSuggestionBadge={notificationPrefs.suggestions}
                />
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
          <div className="profile-view__settings-divider" />
          <SettingsRow
            icon="🚩"
            label={`Flagged Reports${flaggedCount > 0 ? ` (${flaggedCount})` : ""}`}
            onClick={() => setScreen("flagged")}
          />
          <div className="profile-view__settings-divider" />
          <SettingsRow icon="🚪" label="Logout" onClick={() => setShowLogoutConfirm(true)} />
        </div>
      </div>

      {showLogoutConfirm && (
        <div className="alert-backdrop" onClick={() => setShowLogoutConfirm(false)}>
          <div className="alert" onClick={(e) => e.stopPropagation()}>
            <div className="alert__title">Logout?</div>
            <div className="alert__message">
              You'll be signed out of LooCodes on this device. Your codes and account stay exactly
              as they are — sign back in anytime to pick up where you left off.
            </div>
            <div className="alert__actions">
              <button type="button" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="alert__destructive" onClick={confirmLogout}>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

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
            {(avatar.avatarPhoto || avatar.avatarEmoji) && (
              <button
                type="button"
                className="action-sheet__option action-sheet__option--destructive"
                onClick={() => {
                  void clearAvatar();
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
                    void setAvatarEmoji(e);
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

function MyCodeCard({
  bathroom,
  showSuggestionBadge,
}: {
  bathroom: Bathroom;
  showSuggestionBadge: boolean;
}) {
  const info = bathroomType(bathroom.type);
  return (
    <div className="my-code-card">
      <div className="my-code-card__icon">{info.emoji}</div>
      <div className="my-code-card__info">
        <div className="my-code-card__name">{bathroom.name}</div>
        <div className="my-code-card__address">{bathroom.address}</div>
        {/* Gated on the "Suggestions on my codes" notification preference —
            the one real, visible effect that toggle has, since there's no
            push-notification delivery behind any of these prefs. */}
        {showSuggestionBadge && bathroom.suggestions.length > 0 && (
          <div className="my-code-card__suggestions">
            💬 {bathroom.suggestions.length} suggestion{bathroom.suggestions.length === 1 ? "" : "s"}
          </div>
        )}
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
