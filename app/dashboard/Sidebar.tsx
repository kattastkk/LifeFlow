"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠", addable: false },
  { href: "/dashboard/today", label: "Today", icon: "☀️", addable: true },
  { href: "/dashboard/calendar", label: "Calendar", icon: "📅", addable: true },
  { href: "/dashboard/tasks", label: "Tasks", icon: "✅", addable: true },
  { href: "/dashboard/todo", label: "To Do List", icon: "📝", addable: true },
  { href: "/dashboard/wantodo", label: "Want To Do", icon: "🌟", addable: true },
  { href: "/dashboard/habits", label: "Habits", icon: "🔥", addable: true },
  { href: "/dashboard/mood", label: "Mood", icon: "💫", addable: false },
  { href: "/dashboard/journal", label: "Journal", icon: "📖", addable: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
        return (
          <div key={item.href} className="group flex items-center gap-1">
            <Link
              href={item.href}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active ? "bg-sidebar-active text-white" : "text-foreground hover:bg-input"
              }`}
            >
              <span className="mr-2">{item.icon}</span>
              {item.label}
            </Link>
            {item.addable && (
              <Link
                href={item.href}
                title={`Add to ${item.label}`}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm font-bold transition-colors ${
                  active
                    ? "text-white hover:bg-white/20"
                    : "text-muted opacity-0 hover:bg-input group-hover:opacity-100"
                }`}
              >
                +
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
