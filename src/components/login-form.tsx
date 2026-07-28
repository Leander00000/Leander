"use client";

import { ArrowRight, KeyRound, LoaderCircle } from "lucide-react";
import { useActionState } from "react";

import { loginAction, type LoginState } from "@/app/actions/auth";

export function LoginForm() {
  const initialState: LoginState = { error: null };
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <form className="login-actions" action={formAction}>
      <label className="pin-field">
        <span>Dashboard PIN</span>
        <input
          name="password"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          placeholder="Enter your PIN"
          pattern="[0-9]{4}"
          maxLength={4}
          required
          autoFocus
          aria-invalid={Boolean(state.error)}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </label>
      <button
        className="button button-primary button-wide"
        type="submit"
        disabled={pending}
      >
        {pending ? (
          <LoaderCircle className="spin" aria-hidden="true" size={18} />
        ) : (
          <KeyRound aria-hidden="true" size={18} />
        )}
        Unlock dashboard
        {!pending ? <ArrowRight aria-hidden="true" size={18} /> : null}
      </button>
      {state.error ? (
        <p className="form-error" id="login-error" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
