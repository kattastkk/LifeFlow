import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-display text-3xl text-primary">Dashboard</h1>
        <p className="mt-2 text-sm text-muted">
          Signed in as {user?.email}. Auth + Supabase are wired up — next
          we&apos;ll build out each page (Today, Calendar, Tasks, etc.).
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/dashboard/todo"
            className="rounded-[10px] bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            Open To Do List
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="rounded-[10px] border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-input"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
