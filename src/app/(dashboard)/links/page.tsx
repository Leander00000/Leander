import { ArrowUpRight, FolderHeart, Plus } from "lucide-react";
import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { QuickLinks } from "@/components/quick-links";

export const metadata: Metadata = {
  title: "Links",
};

export default function LinksPage() {
  return (
    <div className="page-wrap narrow-page">
      <PageHeader
        eyebrow="Services and places"
        title="Links"
        description="A dependable starting point for the things you open often."
      />

      <div className="links-page-grid">
        <QuickLinks />

        <section className="dashboard-card documents-card">
          <div className="card-heading">
            <div>
              <p className="card-kicker">Your own shortcuts</p>
              <h2>Documents and folders</h2>
            </div>
          </div>

          <div className="empty-state">
            <span className="empty-symbol" aria-hidden="true">
              <FolderHeart size={22} />
            </span>
            <div>
              <h3>No personal folders pinned yet.</h3>
              <p>
                V1 opens Google Drive directly. Custom document shortcuts are
                the next small addition after deployment.
              </p>
            </div>
          </div>

          <div className="card-footer">
            <button className="text-button" type="button" disabled>
              <Plus aria-hidden="true" size={16} />
              Add link soon
            </button>
            <a
              className="text-link"
              href="https://drive.google.com/drive/my-drive"
              target="_blank"
              rel="noreferrer"
            >
              Open Drive
              <ArrowUpRight aria-hidden="true" size={15} />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
