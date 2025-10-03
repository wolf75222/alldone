"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types/database.types";

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

interface WorkspaceContextType {
  workspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  setWorkspace: (workspace: Workspace) => void;
  refreshWorkspaces: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(
  undefined,
);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchWorkspaces() {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Ensure user profile exists (fallback if trigger didn't work)
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      // Only create if truly doesn't exist (not an error)
      if (!existingUser && !checkError) {
        const { error: userError } = await supabase.from("users").insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        });

        if (userError && userError.message && userError.code !== "23505") {
          // 23505 = unique violation, ignore it
          console.warn("Could not create user profile:", userError.message);
        }
      }

      // Get workspaces where user is a member
      const { data: members, error: membersError } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);

      // Only log if there's a real error (has a message property)
      if (membersError && membersError.message) {
        console.error(
          "Error fetching workspace members:",
          membersError.message,
        );
      }

      // No members is OK for first-time users
      if (!members || members.length === 0) {
        setWorkspaces([]);
        setWorkspace(null);
        setLoading(false);
        return;
      }

      const workspaceIds = members.map((m) => m.workspace_id);

      const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .in("id", workspaceIds)
        .order("created_at", { ascending: false });

      if (error && error.message) {
        console.error("Error fetching workspaces:", error);
        setLoading(false);
        return;
      }

      setWorkspaces(data || []);

      // Set active workspace from localStorage or first workspace
      const savedWorkspaceId = localStorage.getItem("activeWorkspaceId");
      const activeWorkspace =
        data?.find((w) => w.id === savedWorkspaceId) || data?.[0];

      if (activeWorkspace) {
        setWorkspace(activeWorkspace);
        localStorage.setItem("activeWorkspaceId", activeWorkspace.id);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error in fetchWorkspaces:", error);
      setLoading(false);
    }
  }

  async function refreshWorkspaces() {
    await fetchWorkspaces();
  }

  function handleSetWorkspace(workspace: Workspace) {
    setWorkspace(workspace);
    localStorage.setItem("activeWorkspaceId", workspace.id);
  }

  useEffect(() => {
    if (user) {
      fetchWorkspaces();
    }
  }, [user]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspace,
        workspaces,
        loading,
        setWorkspace: handleSetWorkspace,
        refreshWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
