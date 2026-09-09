import { logout } from "@/app/auth/actions";
import Sidebar from "./Sidebar";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col gap-4 overflow-y-auto border-r border-border bg-white p-4">
        <div className="px-2">
          <div className="font-display text-xl text-sidebar-active">LifeFlow</div>
          <div className="text-xs text-muted">Your personal OS</div>
        </div>
        <Sidebar />
        <div className="flex-1" />
        <form action={logout}>
          <button
            type="submit"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-input"
          >
            Log out
          </button>
        </form>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
