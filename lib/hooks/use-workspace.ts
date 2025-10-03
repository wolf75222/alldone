"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Database } from "@/lib/types/database.types";

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

export function useWorkspace(workspaceId?: string) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    async function fetchWorkspace() {
      try {
        const { data, error } = await supabase
          .from("workspaces")
          .select("*")
          .eq("id", workspaceId)
          .single();

        if (error) throw error;
        setWorkspace(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkspace();
  }, [workspaceId]);

  return { workspace, loading, error };
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function fetchWorkspaces() {
      try {
        const { data, error } = await supabase
          .from("workspaces")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setWorkspaces(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkspaces();
  }, []);

  return { workspaces, loading, error };
}
