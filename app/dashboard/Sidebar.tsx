"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/dashboard/today", label: "Today", icon: "☀️" },
  { href: "/dashboard/calendar", label: "Calendar", icon: "📅" },
  { href: "/dashboard/tasks", label: "Tasks", icon: "✅" },
  { href: "/dashboard/todo", label: "To Do List", icon: "📝" },
  { href: "/dashboard/wantodo", label: "Want To Do", icon: "🌟" },
  { href: "/dashboard/habits", label: "Habits", icon: "🔥" },
  { href: "/dashboard/mood", label: "Mood", icon: "💫" },
  { href: "/dashboard/journal", label: "Journal", icon: "📖" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active ? "bg-sidebar-active text-white" : "text-foreground hover:bg-input"
            }`}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
