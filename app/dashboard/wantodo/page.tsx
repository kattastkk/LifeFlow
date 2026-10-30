import { createClient } from "@/lib/supabase/server";
import type { WantItem } from "@/types/database";
import WantBoard from "./WantBoard";

export default async function WantToDoPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("want_items").select("*").order("created_at", { ascending: false });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: "linear-gradient(135deg,#f9a8d4,#fb923c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
          🌟
        </div>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: "var(--foreground)", lineHeight: 1 }}>Want To Do</h2>
          <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>Dreams, ideas, and experiences I want to explore.</p>
        </div>
      </div>

      <WantBoard items={(data ?? []) as WantItem[]} />
    </div>
  );
}
