import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Milestone } from "@/lib/types/database.types";

export function useMilestones(workspaceId: string | undefined) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setMilestones([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchMilestones() {
      try {
        const { data, error } = await supabase
          .from("milestones")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("due_date", { ascending: true });

        if (error) {
          // If table doesn't exist yet, silently fail (migration not run)
          if (error.code === "42P01") {
            console.warn(
              "Milestones table does not exist. Run migration: supabase/migrations/20251002_create_milestones.sql",
            );
            setMilestones([]);
            setLoading(false);
            return;
          }
          throw error;
        }
        setMilestones(data || []);
      } catch (error) {
        console.error("Error fetching milestones:", error);
        setMilestones([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMilestones();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`milestones:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "milestones",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          fetchMilestones();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [workspaceId]);

  return { milestones, loading };
}

export async function createMilestone(milestone: {
  workspace_id: string;
  project_id?: string | null;
  name: string;
  description?: string | null;
  due_date: string;
  status?: "upcoming" | "completed" | "missed";
  created_by: string;
}) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("milestones")
    .insert(milestone)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMilestone(
  id: string,
  updates: Partial<Omit<Milestone, "id" | "created_at" | "updated_at">>,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("milestones")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteMilestone(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("milestones").delete().eq("id", id);

  if (error) throw error;
}
