"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export interface WorkspaceMember {
  user_id: string;
  workspace_id: string;
  role: string;
  user: {
    id: string;
    email: string;
    full_name?: string;
  };
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchMembers() {
      try {
        const { data, error } = await supabase
          .from("workspace_members")
          .select(
            `
            user_id,
            workspace_id,
            role,
            user:users!workspace_members_user_id_fkey (
              id,
              email,
              full_name
            )
          `,
          )
          .eq("workspace_id", workspaceId);

        if (error) throw error;
        setMembers(data || []);
      } catch (error) {
        console.error("Error fetching workspace members:", error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    }

    fetchMembers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`workspace_members:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workspace_members",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          fetchMembers();
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [workspaceId]);

  return { members, loading };
}
