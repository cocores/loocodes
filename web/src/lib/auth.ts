import {
  GoogleAuthProvider,
  OAuthProvider,
  deleteUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";

export type { User };

export function subscribeToAuthState(onChange: (user: User | null) => void): () => void {
  return onAuthStateChanged(getFirebaseAuth(), onChange);
}

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  await ensureUserProfile(credential.user);
  return credential.user;
}

export async function signInWithApple(): Promise<User> {
  const provider = new OAuthProvider("apple.com");
  provider.addScope("email");
  provider.addScope("name");
  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  await ensureUserProfile(credential.user);
  return credential.user;
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
