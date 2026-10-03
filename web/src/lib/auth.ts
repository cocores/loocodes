import {
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type AuthProvider as FirebaseAuthProvider,
  type User,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";

export type { User };

export interface NotificationPrefs {
  nearbyNew: boolean;
  weeklyDigest: boolean;
  codeVerified: boolean;
  codeFlagged: boolean;
  suggestions: boolean;
  quietHours: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  nearbyNew: false,
  weeklyDigest: false,
  codeVerified: false,
  codeFlagged: false,
  suggestions: false,
  quietHours: false,
};

export function subscribeToAuthState(onChange: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    // Fires for every way a user ends up signed in (popup, redirect
    // completion, a session restored from a previous visit, emulator
    // state, etc.) — ensureUserProfile is idempotent (checks existence
    // first), so calling it here unconditionally is simpler and more
    // robust than trying to call it only right after a fresh sign-in.
    if (user) void ensureUserProfile(user);
    onChange(user);
  });
}

// Neither popup nor redirect is reliable everywhere, so pick per device:
//
// - signInWithPopup breaks on mobile Safari — it can't reliably open a true
//   popup window or message back to the opener tab, leaving the user
//   stranded on Firebase's auth handler page ("The requested action is
//   invalid") with no JS-catchable error at all.
// - signInWithRedirect breaks silently on some desktop browsers/privacy
//   settings — completing the round trip back from the provider needs a
//   cross-origin relay to Firebase's authDomain (a different origin than
//   this app), which browsers increasingly block as third-party storage
//   access by default. No error is thrown either; getRedirectResult()
//   just resolves with no user, same as if nothing had happened.
//
// Popup is the better default where it's known to work (desktop), redirect
// is used where popup is known to be broken (mobile).
function prefersRedirect(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android|Mobi/i.test(navigator.userAgent);
}

async function signIn(provider: FirebaseAuthProvider): Promise<void> {
  const auth = getFirebaseAuth();
  if (prefersRedirect()) {
    await signInWithRedirect(auth, provider);
    return;
  }
  try {
    const credential = await signInWithPopup(auth, provider);
    await ensureUserProfile(credential.user);
  } catch (err) {
    const code = (err as { code?: string }).code;
    // Desktop Safari/Firefox with strict popup settings, or a user who
    // dismissed the popup and should get a cleaner second attempt via
    // redirect rather than a dead end.
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw err;
  }
}

export async function signInWithGoogle(): Promise<void> {
  await signIn(new GoogleAuthProvider());
}

export async function signInWithApple(): Promise<void> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  await signIn(provider);
}

/** Call once on app load to surface any error from a sign-in redirect that
 * just completed (e.g. auth/account-exists-with-different-credential) —
 * profile creation itself is handled by subscribeToAuthState above, this
 * is only for errors getRedirectResult would otherwise throw silently. */
export async function completeRedirectSignIn(): Promise<void> {
  await getRedirectResult(getFirebaseAuth());
}

export async function signOutUser(): Promise<void> {
  await signOut(getFirebaseAuth());
}

/** Permanently deletes this account's Firestore profile and Firebase Auth
 * user. Never touches bathrooms/suggestions the account submitted — those
 * stay public, same as the old per-browser "reset identity" did, just with
 * a real account now actually being removed. Firebase requires a "recent"
 * sign-in for this; if it's been a while, this throws auth/requires-recent-login
 * and the caller should ask the user to sign in again and retry. */
export async function deleteAccount(): Promise<void> {
  const current = getFirebaseAuth().currentUser;
  if (!current) return;
  try {
    await deleteDoc(doc(getDb(), "users", current.uid));
  } catch {
    // Best effort — still try to delete the auth user below even if the
    // profile doc was already gone or unreachable.
  }
  await deleteUser(current);
}

/** Creates this user's Firestore profile doc on first sign-in; leaves it
 * alone on every sign-in after that (createdAt is immutable by rule, and
 * there's nothing else here worth overwriting on every login). */
async function ensureUserProfile(user: User): Promise<void> {
  const ref = doc(getDb(), "users", user.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) return;

  const provider = user.providerData[0]?.providerId ?? "google.com";
  await setDoc(ref, {
    displayName: user.displayName?.slice(0, 100) || "LooCodes User",
    email: user.email,
    provider,
    createdAt: Date.now(),
    notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
  });
}

/** Profiles created before notificationPrefs existed don't have it at all —
 * callers always get a complete object back, defaulted to all-off, so they
 * never have to branch on whether the field is present. */
export async function getNotificationPrefs(uid: string): Promise<NotificationPrefs> {
  const snap = await getDoc(doc(getDb(), "users", uid));
  const stored = snap.data()?.notificationPrefs as Partial<NotificationPrefs> | undefined;
  return { ...DEFAULT_NOTIFICATION_PREFS, ...stored };
}

export async function updateNotificationPrefs(uid: string, prefs: NotificationPrefs): Promise<void> {
  await updateDoc(doc(getDb(), "users", uid), { notificationPrefs: prefs });
}
