import { useAuth } from "../store/AuthContext";
import "./LoginView.css";

export function LoginView() {
  const { signInWithApple, signInWithGoogle, error } = useAuth();

  return (
    <div className="screen login-view">
      <div className="login-view__body">
        <div className="login-view__logo">🚽</div>
        <h1 className="login-view__title">LooCodes</h1>
        <p className="login-view__subtitle">
          Find and share bathroom access codes nearby. Sign in to get started.
        </p>

        <div className="login-view__buttons">
          <button type="button" className="login-view__apple-btn" onClick={() => void signInWithApple()}>
            <AppleLogo /> Sign in with Apple
          </button>
          <button type="button" className="login-view__google-btn" onClick={() => void signInWithGoogle()}>
            <GoogleLogo /> Sign in with Google
          </button>
        </div>

        {error && <p className="login-view__error">⚠ {error}</p>}

        <p className="login-view__fine-print">
          By continuing you agree to use LooCodes respectfully — shared codes are a community
          resource.
        </p>
      </div>
    </div>
  );
}

function AppleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.468 2.157-1.235 2.918-.853.823-2.013 1.336-3.11 1.24-.147-1.08.42-2.228 1.11-2.918C13.86 1.84 15.27 1.19 16.365 1.43zM20.53 17.15c-.57 1.317-.843 1.906-1.576 3.074-1.03 1.638-2.48 3.68-4.284 3.695-1.603.014-2.016-1.047-4.195-1.034-2.178.012-2.633 1.052-4.236 1.038-1.804-.015-3.177-1.857-4.21-3.494C-0.19 16.63-0.532 11.5 1.45 8.56c1.4-2.072 3.61-3.284 5.688-3.284 2.11 0 3.44 1.184 5.19 1.184 1.698 0 2.73-1.187 5.19-1.187 1.846 0 3.804.994 5.197 2.715-4.567 2.47-3.826 9.03-1.18 9.16z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.85A10.99 10.99 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.85z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a10.99 10.99 0 0 0-9.82 6.05l3.66 2.85c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </svg>
  );
}
