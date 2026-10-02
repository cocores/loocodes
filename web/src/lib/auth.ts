import {
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";

export type { User };

export function subscribeToAuthState(onChange: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), (user) => {
    // Fires for every way a user ends up signed in (redirect completion,
    // a session restored from a previous visit, emulator state, etc.) —
    // ensureUserProfile is idempotent (checks existence first), so calling
    // it here unconditionally is simpler and more robust than trying to
    // call it only right after a fresh sign-in.
    if (user) void ensureUserProfile(user);
    onChange(user);
  });
}

// signInWithPopup is unreliable on mobile Safari (iOS can't reliably open a
// true popup window or message back to the opener tab — the user ends up
// stranded on Firebase's auth handler page with "The requested action is
// invalid"). signInWithRedirect works everywhere, including desktop, at
// the cost of a full-page navigation away and back.
export async function signInWithGoogle(): Promise<void> {
  await signInWithRedirect(getFirebaseAuth(), new GoogleAuthProvider());
}

export async function signInWithApple(): Promise<void> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  await signInWithRedirect(getFirebaseAuth(), provider);
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
  });
}
