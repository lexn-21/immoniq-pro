import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Zählt offene + überfällige Tickets (nicht resolved, nicht aktiv geschnoozt).
 * Realtime-aktualisiert. Initialwert null bis Auth + erster Fetch durch sind.
 */
export function useTicketCounts() {
  const [counts, setCounts] = useState<{ open: number; overdue: number } | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (active) setCounts({ open: 0, overdue: 0 }); return; }

      const [openR, overdueR] = await Promise.all([
        supabase.from("tenant_issues")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "resolved")
          .or(`snooze_until.is.null,snooze_until.lte.${today}`),
        supabase.from("tenant_issues")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .neq("status", "resolved")
          .or(`snooze_until.is.null,snooze_until.lte.${today}`)
          .not("due_date", "is", null)
          .lte("due_date", today),
      ]);
      if (!active) return;
      setCounts({ open: openR.count ?? 0, overdue: overdueR.count ?? 0 });
    };

    load();
    const ch = supabase
      .channel("ticket_counts_rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "tenant_issues" }, load)
      .subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, []);

  return counts;
}
