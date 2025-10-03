"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/types/database.types";

type Team = Database["public"]["Tables"]["teams"]["Row"];
type TeamInsert = Database["public"]["Tables"]["teams"]["Insert"];
type TeamUpdate = Database["public"]["Tables"]["teams"]["Update"];

export function useTeams(workspaceId: string | undefined) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setTeams([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchTeams() {
      try {
        const { data, error } = await supabase
          .from("teams")
          .select("*")
          .eq("workspace_id", workspaceId)
          .order("name");

        if (error) throw error;
        setTeams(data || []);
      } catch (error) {
        console.error("Error fetching teams:", error);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    }

    fetchTeams();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`teams:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          fetchTeams();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [workspaceId]);

  return { teams, loading };
}

export async function createTeam(team: TeamInsert) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teams")
    .insert(team)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateTeam(id: string, updates: TeamUpdate) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("teams")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteTeam(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("teams").delete().eq("id", id);

  if (error) throw error;
}
