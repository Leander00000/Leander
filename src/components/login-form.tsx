"use client";

import { ArrowRight, LoaderCircle } from "lucide-react";
import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signInError) {
        throw signInError;
      }
    } catch {
      setError("Sign-in could not be started. Please try again.");
      setPending(false);
    }
  }

  return (
    <div className="login-actions">
      <button
        className="button button-primary button-wide"
        type="button"
        onClick={signIn}
        disabled={pending}
      >
        {pending ? (
          <LoaderCircle className="spin" aria-hidden="true" size={18} />
        ) : (
          <span className="google-g" aria-hidden="true">
            G
          </span>
        )}
        Continue with Google
        {!pending ? <ArrowRight aria-hidden="true" size={18} /> : null}
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

