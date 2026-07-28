"use client";

import {
  CheckCircle2,
  Home,
  Link2,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const navigation: NavigationItem[] = [
  { href: "/", label: "Today", icon: Home },
  { href: "/habits", label: "Habits", icon: CheckCircle2 },
  { href: "/links", label: "Links", icon: Link2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="app-navigation" aria-label="Main navigation">
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            href={item.href}
            className="nav-link"
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
            key={item.href}
          >
            <Icon aria-hidden="true" size={19} strokeWidth={1.8} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

