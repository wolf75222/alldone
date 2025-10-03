"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/lib/context/workspace-context";
import { useAuth } from "@/lib/hooks/use-auth";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Rocket, Plus, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/lib/types/database.types";

type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

export default function WorkspacesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { workspaces, loading, setWorkspace, refreshWorkspaces } =
    useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleCreateWorkspace() {
    if (!name || !slug) {
      setError("Name and slug are required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const supabase = createClient();

      // Ensure user profile exists (fallback if trigger didn't work)
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", user!.id)
        .maybeSingle();

      if (!existingUser) {
        const { error: userError } = await supabase.from("users").insert({
          id: user!.id,
          email: user!.email!,
          full_name: user!.user_metadata?.full_name || null,
          avatar_url: user!.user_metadata?.avatar_url || null,
        });

        // Ignore unique constraint violations (user already exists) and empty errors
        if (userError && userError.message && userError.code !== "23505") {
          console.error("Error creating user profile:", userError);
          throw new Error("Failed to create user profile. Please try again.");
        }
      }

      // Create workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert({ name, slug, created_by: user!.id })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Add current user as owner
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: user!.id,
          role: "owner",
        });

      if (memberError) throw memberError;

      // Refresh workspaces and set as active
      await refreshWorkspaces();
      setWorkspace(workspace);

      // Redirect to home
      router.push(`/`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create workspace",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function handleSelectWorkspace(workspace: Workspace) {
    setWorkspace(workspace);
    router.push("/");
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  return (
    <AuthGuard>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-4xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Select or Create a Workspace</h1>
            <p className="text-muted-foreground">
              Workspaces help you organize your projects and teams
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Existing Workspaces */}
              {workspaces.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-semibold">Your Workspaces</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    {workspaces.map((workspace) => (
                      <Card
                        key={workspace.id}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                        onClick={() => handleSelectWorkspace(workspace)}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <Rocket className="h-5 w-5" />
                              </div>
                              <div>
                                <CardTitle>{workspace.name}</CardTitle>
                                <CardDescription className="text-xs">
                                  {workspace.slug}
                                </CardDescription>
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Workspace */}
              <div className="flex justify-center pt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="lg">
                      <Plus className="mr-2 h-5 w-5" />
                      Create New Workspace
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create a new workspace</DialogTitle>
                      <DialogDescription>
                        Set up a new workspace to organize your projects and
                        teams.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                      {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                          {error}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="name">Workspace Name</Label>
                        <Input
                          id="name"
                          placeholder="My Company"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            if (!slug || slug === generateSlug(name)) {
                              setSlug(generateSlug(e.target.value));
                            }
                          }}
                          disabled={isCreating}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="slug">URL Slug</Label>
                        <Input
                          id="slug"
                          placeholder="my-company"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          disabled={isCreating}
                        />
                        <p className="text-xs text-muted-foreground">
                          This will be used in URLs and must be unique
                        </p>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        onClick={handleCreateWorkspace}
                        disabled={isCreating || !name || !slug}
                      >
                        {isCreating ? "Creating..." : "Create Workspace"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
