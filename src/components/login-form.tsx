import { ArrowRight } from "lucide-react";

export function LoginForm() {
  return (
    <div className="login-actions">
      <a
        className="button button-primary button-wide"
        href="/auth/google"
      >
        <span className="google-g" aria-hidden="true">
          G
        </span>
        Continue with Google
        <ArrowRight aria-hidden="true" size={18} />
      </a>
    </div>
  );
}
