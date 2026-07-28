import { CalendarDays } from "lucide-react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  badge?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  badge,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        <p className="page-eyebrow">
          <CalendarDays aria-hidden="true" size={15} />
          {eyebrow}
        </p>
        <div className="page-title-row">
          <h1>{title}</h1>
          {badge ? <span className="soft-badge">{badge}</span> : null}
        </div>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
    </header>
  );
}

