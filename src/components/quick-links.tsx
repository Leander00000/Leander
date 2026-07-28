import {
  ArrowUpRight,
  CalendarDays,
  CheckSquare2,
  HardDrive,
  Mail,
  StickyNote,
} from "lucide-react";

const links = [
  {
    label: "Drive",
    detail: "Files",
    href: "https://drive.google.com/drive/my-drive",
    icon: HardDrive,
    tone: "blue",
  },
  {
    label: "Keep",
    detail: "Notes",
    href: "https://keep.google.com",
    icon: StickyNote,
    tone: "yellow",
  },
  {
    label: "Calendar",
    detail: "Schedule",
    href: "https://calendar.google.com",
    icon: CalendarDays,
    tone: "green",
  },
  {
    label: "Gmail",
    detail: "Inbox",
    href: "https://mail.google.com",
    icon: Mail,
    tone: "red",
  },
  {
    label: "Todoist",
    detail: "All tasks",
    href: "https://app.todoist.com/app",
    icon: CheckSquare2,
    tone: "clay",
  },
];

export function QuickLinks() {
  return (
    <section className="dashboard-card quick-links-card">
      <div className="card-heading">
        <div>
          <p className="card-kicker">Open quickly</p>
          <h2>Quick links</h2>
        </div>
      </div>

      <div className="quick-links-grid">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <a
              className="quick-link"
              data-tone={link.tone}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              key={link.label}
            >
              <span className="quick-link-icon">
                <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
              </span>
              <span>
                <strong>{link.label}</strong>
                <small>{link.detail}</small>
              </span>
              <ArrowUpRight
                className="quick-link-arrow"
                aria-hidden="true"
                size={14}
              />
            </a>
          );
        })}
      </div>
    </section>
  );
}

