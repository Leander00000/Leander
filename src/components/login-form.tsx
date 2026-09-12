"use client";

import { useEffect, useRef, useState } from "react";

export function LoginForm() {
  const pending = useRef(false);
  const [message, setMessage] = useState(
    "Open your private device link to access the dashboard. This browser will then be remembered for 180 days.",
  );
  useEffect(() => {
    function openLink() {
      const key = new URLSearchParams(window.location.hash.slice(1)).get("key");
      if (!key || pending.current) return;
      pending.current = true;
      // The key stays out of request URLs, referrers and browser history.
      window.history.replaceState(null, "", "/login");
      fetch("/auth/device", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      })
        .then(async (response) => {
          if (response.ok) window.location.replace("/");
          else
            setMessage(
              (await response.json()).error ||
                "The private link could not be opened.",
            );
        })
        .catch(() =>
          setMessage(
            "Could not connect. Reopen your private link to try again.",
          ),
        )
        .finally(() => {
          pending.current = false;
        });
    }
    openLink();
    window.addEventListener("hashchange", openLink);
    return () => window.removeEventListener("hashchange", openLink);
  }, []);
  return (
    <p role="status" className="auth-note">
      {message}
    </p>
  );
}
