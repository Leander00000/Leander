import { LogOut } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/actions/auth";
import { AppNavigation } from "@/components/app-navigation";
import type { Viewer } from "@/lib/types";

type AppShellProps = {
  viewer: Viewer;
  children: ReactNode;
};

export function AppShell({ viewer, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Leander home">
          <span className="brand-mark" aria-hidden="true">
            L
          </span>
          <span className="brand-word">Leander</span>
        </Link>

        <AppNavigation />

        <div className="sidebar-footer">
          {viewer.isDemo ? (
            <div className="account-card">
              <span className="avatar" aria-hidden="true">
                L
              </span>
              <span className="account-copy">
                <strong>Preview mode</strong>
                <small>Sample data</small>
              </span>
            </div>
          ) : (
            <form action={signOutAction}>
              <button className="account-card account-button" type="submit">
                <span className="avatar" aria-hidden="true">
                  L
                </span>
                <span className="account-copy">
                  <strong>{viewer.name}</strong>
                  <small>{viewer.email}</small>
                </span>
                <LogOut aria-hidden="true" size={17} />
              </button>
            </form>
          )}
        </div>
      </aside>

      <main className="main-content">{children}</main>

      <div className="mobile-navigation">
        <AppNavigation />
      </div>
    </div>
  );
}

