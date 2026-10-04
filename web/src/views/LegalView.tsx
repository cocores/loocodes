import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import "./LegalView.css";

// Both documents describe this app as it actually works today, not as a
// generic template — see each section. Keep this in sync whenever data
// collection, account deletion, or content-moderation behavior changes
// (firestore.rules' data-model comment is the other place that drifts).
const LAST_UPDATED = "October 4, 2026";

function LegalLayout({
  title,
  showLegalDisclaimer = true,
  children,
}: {
  title: string;
  showLegalDisclaimer?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="legal">
      <header className="legal__header">
        <Link className="legal__back" to="/">
          ‹ Back
        </Link>
      </header>
      <div className="legal__body">
        <h1>{title}</h1>
        <p className="legal__updated">Last updated: {LAST_UPDATED}</p>
        {showLegalDisclaimer && (
          <p className="legal__disclaimer">
            This is a plain-language draft, not legal advice — it describes how LooCodes actually
            works today. Have a lawyer review it against your local requirements (GDPR, CCPA, App
            Store/Play Store policies, etc.) before relying on it for a public launch.
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

export function TermsView() {
  return (
    <LegalLayout title="Terms of Service">
      <h2>1. What LooCodes Is</h2>
      <p>
        LooCodes is a community-sourced directory of bathroom access — door codes, free public
        restrooms, and everything in between. Listings are submitted by people who use them, and
        confirmed or flagged by the community over time. We don't own, operate, or inspect any of
        the physical locations listed in the app.
      </p>

      <h2>2. Accounts</h2>
      <p>
        You need an account (Sign in with Apple or Google) to use LooCodes. You're responsible for
        the activity on your account and for keeping your sign-in credentials secure. Provide
        accurate information when you sign up, and don't create an account to impersonate someone
        else or to evade a suspension.
      </p>

      <h2>3. Content You Submit</h2>
      <p>
        When you share a bathroom code, location, note, suggested update, vote, or flag, you're
        giving LooCodes a license to display that content to other users as part of the service.
        You keep ownership of what you submit, but you're responsible for it — don't submit
        anything that:
      </p>
      <ul>
        <li>is false, misleading, or something you don't have the right to share;</li>
        <li>violates the law or another person's or business's rights;</li>
        <li>is abusive, harassing, hateful, or sexually explicit; or</li>
        <li>is spam, an advertisement, or unrelated to finding a bathroom.</li>
      </ul>
      <p>
        <strong>A code being shared here doesn't make using it authorized.</strong> Access codes
        are meant for the location's intended patrons under whatever policy that business or
        property already has — LooCodes doesn't grant, verify, or guarantee a right of entry.
        Respect posted rules, and don't use a listing to access somewhere you haven't been invited
        to.
      </p>

      <h2>4. Accuracy and Availability</h2>
      <p>
        Codes change, places close, and policies shift — the "It Works" and flag system exists
        because listings go stale. We make no promise that any listing is current, accurate, or
        that the location even still exists. Use the app at your own judgment, and please
        reconfirm or flag anything you find out of date so it stays useful for the next person.
      </p>

      <h2>5. Moderation and Enforcement</h2>
      <p>
        We can remove content or suspend or terminate an account that violates these terms, at our
        discretion, with or without notice. We don't pre-screen submissions and aren't obligated to
        monitor the service, but we may review flagged content.
      </p>

      <h2>6. Disclaimer of Warranties</h2>
      <p>
        LooCodes is provided "as is" and "as available," without warranties of any kind, express or
        implied, including fitness for a particular purpose or non-infringement. We don't warrant
        that the service will be uninterrupted, secure, or error-free.
      </p>

      <h2>7. Limitation of Liability</h2>
      <p>
        To the fullest extent the law allows, LooCodes and its creators aren't liable for any
        indirect, incidental, or consequential damages arising from your use of the service or of
        any location or code listed in it — including anything that happens while visiting a
        location found through the app.
      </p>

      <h2>8. Ending Your Account</h2>
      <p>
        You can delete your account at any time from Settings → Privacy → Delete Account. Codes
        and locations you've already shared stay public for others to use — they're a community
        resource — but stop being tied to your identity once your account is gone. See the Privacy
        Policy for details.
      </p>

      <h2>9. Changes to These Terms</h2>
      <p>
        We may update these terms as the app changes. We'll update the "Last updated" date above
        when we do; continuing to use LooCodes after a change means you accept the new terms.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about these terms? Reach us at{" "}
        <a href="mailto:hello@loocodes.app">hello@loocodes.app</a>.
      </p>
    </LegalLayout>
  );
}

export function PrivacyView() {
  return (
    <LegalLayout title="Privacy Policy">
      <h2>1. Overview</h2>
      <p>
        This policy covers what LooCodes collects, why, and the choices you have about it. The
        short version: we collect what's needed to run a sign-in-required, community-maintained
        bathroom directory, we don't sell your data, and we don't use any analytics, tracking, or
        advertising service today.
      </p>

      <h2>2. Information You Provide</h2>
      <ul>
        <li>
          <strong>Account info:</strong> your display name, email address (if your sign-in
          provider shares one), and which provider you used (Apple or Google) — collected when you
          first sign in.
        </li>
        <li>
          <strong>Profile photo or emoji:</strong> optional. A photo you upload is resized and
          compressed on your device before it's ever sent anywhere.
        </li>
        <li>
          <strong>Listings and activity:</strong> bathroom names, addresses, codes, notes, photos
          are not collected for listings, but votes ("It Works"), flags, and suggested updates you
          submit are all stored and shown as part of the shared directory.
        </li>
        <li>
          <strong>Notification preferences:</strong> the toggle choices you make in Settings.
        </li>
      </ul>

      <h2>3. Information From Your Sign-In Provider</h2>
      <p>
        Signing in with Apple or Google shares your name and email (or, with Apple's "Hide My
        Email," a private relay address) with us, under that provider's own privacy policy. We
        only use it to create and identify your LooCodes account.
      </p>

      <h2>4. Location</h2>
      <p>
        LooCodes asks for your device location to sort nearby bathrooms and show distances. That
        location is used entirely on your device — it is never sent to or stored on our servers.
        You can deny or revoke location access at any time in your device settings; the app still
        works without it, just without distance sorting.
      </p>

      <h2>5. What We Don't Collect</h2>
      <p>
        We don't currently use any analytics, advertising, or tracking service, and we don't build
        an advertising profile from your activity. (Some Settings toggles describe
        features — like a weekly digest — that aren't built yet; toggling them only saves your
        preference for when they are.)
      </p>

      <h2>6. What's Public vs. Private</h2>
      <p>
        Bathroom listings, codes, notes, vote counts, flags, and suggestions are visible to every
        signed-in user — that's the point of a shared directory. Your account profile (display
        name, email, avatar, notification preferences) is private: it's readable only by you, and
        nothing in the app shows your name or email next to the listings you've submitted or voted
        on.
      </p>

      <h2>7. How We Use Information</h2>
      <p>
        To operate the service: show you nearby listings, let you manage the codes you've shared
        under "My Codes," keep the community vote/flag system working, and remember your
        preferences across devices.
      </p>

      <h2>8. Storage and Security</h2>
      <p>
        Your data is stored on Google Firebase/Cloud Platform infrastructure. Access to your
        account profile is restricted by server-side security rules to your account alone — no
        other user, signed in or not, can read it.
      </p>

      <h2>9. Deleting Your Account</h2>
      <p>
        Deleting your account (Settings → Privacy → Delete Account) permanently removes your
        profile — display name, email, avatar, and preferences — and your sign-in. Bathrooms and
        suggestions you've already shared stay public for others to use, the same way they would if
        you'd shared them anonymously; they're no longer associated with an active account of
        yours.
      </p>

      <h2>10. Your Choices</h2>
      <ul>
        <li>Change or remove your profile photo/emoji anytime in Settings.</li>
        <li>Turn notification preferences on or off anytime in Settings.</li>
        <li>Deny or revoke location access in your device settings.</li>
        <li>Delete your account anytime, as described above.</li>
      </ul>

      <h2>11. Children's Privacy</h2>
      <p>
        LooCodes isn't directed at children under 13, and we don't knowingly collect information
        from them. If you believe a child has created an account, contact us and we'll remove it.
      </p>

      <h2>12. Third-Party Services</h2>
      <p>
        LooCodes runs on Google Firebase (authentication and database) and uses Sign in with Apple
        and Sign in with Google for account creation. Map tiles are loaded from OpenStreetMap's
        servers, which — like any map provider — can see the IP address of the device requesting
        them. Each of these providers has its own privacy policy governing data they process.
      </p>

      <h2>13. Changes to This Policy</h2>
      <p>
        We may update this policy as the app changes. We'll update the "Last updated" date above
        when we do.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about this policy or your data? Reach us at{" "}
        <a href="mailto:hello@loocodes.app">hello@loocodes.app</a>.
      </p>
    </LegalLayout>
  );
}

interface LicenseEntry {
  name: string;
  version: string;
  license: string;
  url: string;
}

// Kept as a hand-maintained list rather than generated at build time —
// update it when a dependency is added, removed, or bumped to a new major
// version. Versions are the range/floor actually pinned in web/package.json
// and project.yml, not necessarily what's resolved right now.
const WEB_LICENSES: LicenseEntry[] = [
  { name: "React / React DOM", version: "19.x", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "React Router", version: "7.x", license: "MIT", url: "https://github.com/remix-run/react-router" },
  { name: "Firebase JS SDK", version: "12.x", license: "Apache-2.0", url: "https://github.com/firebase/firebase-js-sdk" },
  { name: "Leaflet", version: "1.9.x", license: "BSD-2-Clause", url: "https://github.com/Leaflet/Leaflet" },
  { name: "Leaflet.markercluster", version: "1.5.x", license: "MIT", url: "https://github.com/Leaflet/Leaflet.markercluster" },
];

const IOS_LICENSES: LicenseEntry[] = [
  { name: "Firebase iOS SDK", version: "11.x+", license: "Apache-2.0", url: "https://github.com/firebase/firebase-ios-sdk" },
  { name: "GoogleSignIn-iOS", version: "7.1.x+", license: "Apache-2.0", url: "https://github.com/google/GoogleSignIn-iOS" },
];

function LicenseList({ entries }: { entries: LicenseEntry[] }) {
  return (
    <ul className="legal__licenses">
      {entries.map((e) => (
        <li key={e.name}>
          <div className="legal__license-row">
            <a href={e.url} target="_blank" rel="noopener noreferrer">
              {e.name}
            </a>
            <span className="legal__license-badge">{e.license}</span>
          </div>
          <div className="legal__license-version">v{e.version}</div>
        </li>
      ))}
    </ul>
  );
}

export function LicensesView() {
  return (
    <LegalLayout title="Open Source Licenses" showLegalDisclaimer={false}>
      <p>
        LooCodes is built on the open source projects below. We're grateful to their authors and
        contributors — each remains under its own license, linked here.
      </p>

      <h2>Web app</h2>
      <LicenseList entries={WEB_LICENSES} />

      <h2>iOS app</h2>
      <LicenseList entries={IOS_LICENSES} />

      <h2>Map data</h2>
      <p>
        Map tiles and location data are ©{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap
        </a>{" "}
        contributors, available under the Open Database License (ODbL).
      </p>
    </LegalLayout>
  );
}
