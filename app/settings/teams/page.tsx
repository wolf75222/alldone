"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useWorkspace } from "@/lib/context/workspace-context";
import {
  useTeams,
  createTeam,
  updateTeam,
  deleteTeam,
} from "@/lib/hooks/use-teams";
import { useWorkspaceMembers } from "@/lib/hooks/use-workspace-members";
import { AuthGuard } from "@/components/auth-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plus, Edit, Trash2, Users } from "lucide-react";
import { Database } from "@/lib/types/database.types";

type Team = Database["public"]["Tables"]["teams"]["Row"];

const TEAM_COLORS = [
  "#ef4444", // red
  "#f59e0b", // orange
  "#10b981", // green
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
];

export default function TeamsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { teams, loading } = useTeams(workspace?.id);
  const { members } = useWorkspaceMembers(workspace?.id);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentMember = members.find((m) => m.user_id === user?.id);
  const canManageTeams =
    currentMember?.role === "owner" ||
    currentMember?.role === "admin" ||
    currentMember?.role === "maintainer";

  async function handleCreateTeam() {
    if (!name || !workspace || !user) return;

    setIsCreating(true);
    setError(null);

    try {
      await createTeam({
        workspace_id: workspace.id,
        name,
        description: description || null,
        color,
        created_by: user.id,
      });

      setName("");
      setDescription("");
      setColor(TEAM_COLORS[0]);
      setIsDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdateTeam() {
    if (!name || !editingTeam) return;

    setIsCreating(true);
    setError(null);

    try {
      await updateTeam(editingTeam.id, {
        name,
        description: description || null,
        color,
      });

      setName("");
      setDescription("");
      setColor(TEAM_COLORS[0]);
      setEditingTeam(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDeleteTeam() {
    if (!deletingTeam) return;

    try {
      await deleteTeam(deletingTeam.id);
      setDeletingTeam(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team");
    }
  }

  function handleEditClick(team: Team) {
    setEditingTeam(team);
    setName(team.name);
    setDescription(team.description || "");
    setColor(team.color);
  }

  if (!workspaceLoading && !workspace) {
    router.push("/workspaces");
    return null;
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Teams</h1>
            <p className="text-muted-foreground">
              Organize members into teams for better collaboration
            </p>
          </div>
          {canManageTeams && (
            <Button
              onClick={() => {
                setEditingTeam(null);
                setName("");
                setDescription("");
                setColor(TEAM_COLORS[0]);
                setIsDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Team
            </Button>
          )}
        </div>

        {/* Teams Grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : teams.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
              <p className="text-muted-foreground mb-4">
                Create teams to organize your workspace members
              </p>
              {canManageTeams && (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Team
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card key={team.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      <CardTitle>{team.name}</CardTitle>
                    </div>
                    {canManageTeams && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditClick(team)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => setDeletingTeam(team)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {team.description && (
                    <CardDescription>{team.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>Click to manage members</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog
          open={isDialogOpen || !!editingTeam}
          onOpenChange={(open) => {
            if (!open) {
              setIsDialogOpen(false);
              setEditingTeam(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? "Edit Team" : "Create Team"}
              </DialogTitle>
              <DialogDescription>
                {editingTeam
                  ? "Update team information"
                  : "Create a new team for your workspace"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="team-name">Name *</Label>
                <Input
                  id="team-name"
                  placeholder="Engineering Team"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="team-description">Description</Label>
                <Textarea
                  id="team-description"
                  placeholder="Describe the team..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCreating}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {TEAM_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-8 h-8 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setColor(c)}
                      disabled={isCreating}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setEditingTeam(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingTeam ? handleUpdateTeam : handleCreateTeam}
                disabled={isCreating || !name}
              >
                {isCreating
                  ? "Saving..."
                  : editingTeam
                    ? "Update Team"
                    : "Create Team"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog
          open={!!deletingTeam}
          onOpenChange={(open) => !open && setDeletingTeam(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete team</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this team? This action cannot be
                undone. Projects and tasks assigned to this team will be
                unassigned.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteTeam}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGuard>
  );
}
