"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { useRouter } from "next/navigation";
import {
  useProjects,
  createProject,
  updateProject,
  deleteProject,
} from "@/lib/hooks/use-projects";
import { useAuth } from "@/lib/hooks/use-auth";
import { useWorkspace } from "@/lib/context/workspace-context";
import { useTeams } from "@/lib/hooks/use-teams";
import { AuthGuard } from "@/components/auth-guard";
import { ProjectTreeItem } from "@/components/project-tree-item";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  MoreVertical,
  FolderKanban,
  Trash2,
  Edit,
  Calendar,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Project = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  workspace_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  parent_project_id: string | null;
  team_id: string | null;
};

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { projects, loading } = useProjects(workspace?.id);
  const { teams } = useTeams(workspace?.id);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [parentProjectId, setParentProjectId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Redirect to workspaces if no workspace selected
  useEffect(() => {
    if (!workspaceLoading && !workspace) {
      router.push("/workspaces");
    }
  }, [workspace, workspaceLoading, router]);

  // Build project tree hierarchy
  const projectTree = React.useMemo(() => {
    const rootProjects = projects.filter((p) => !p.parent_project_id);
    const getChildren = (parentId: string): Project[] => {
      return projects.filter((p) => p.parent_project_id === parentId);
    };
    return { rootProjects, getChildren };
  }, [projects]);

  async function handleCreateProject() {
    if (!name) {
      setError("Project name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    if (!workspace) {
      setError("No workspace selected");
      return;
    }

    try {
      await createProject({
        name,
        description: description || null,
        workspace_id: workspace.id,
        created_by: user!.id,
        status: "active",
        parent_project_id: parentProjectId,
        team_id: teamId,
      });

      setName("");
      setDescription("");
      setParentProjectId(null);
      setTeamId(null);
      setIsDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setIsCreating(false);
    }
  }

  function handleEditClick(project: Project & { team_id?: string | null }) {
    setEditingProject(project);
    setName(project.name);
    setDescription(project.description || "");
    setParentProjectId(project.parent_project_id);
    setTeamId(project.team_id || null);
    setError(null);
  }

  function handleCreateSubProject(parentId: string) {
    setParentProjectId(parentId);
    setName("");
    setDescription("");
    setIsDialogOpen(true);
  }

  async function handleUpdateProject() {
    if (!name || !editingProject) {
      setError("Project name is required");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await updateProject(editingProject.id, {
        name,
        description: description || null,
        parent_project_id: parentProjectId,
        team_id: teamId,
      });

      setName("");
      setDescription("");
      setParentProjectId(null);
      setTeamId(null);
      setEditingProject(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update project");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingProject) return;

    try {
      await deleteProject(deletingProject.id);
      setDeletingProject(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete project");
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Projects</h1>
            <p className="text-muted-foreground">
              Manage your projects and track progress
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a new project</DialogTitle>
                <DialogDescription>
                  Add a new project to organize your work.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name *</Label>
                  <Input
                    id="project-name"
                    placeholder="My Awesome Project"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="project-description">Description</Label>
                  <Textarea
                    id="project-description"
                    placeholder="Describe your project..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isCreating}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent-project">
                    Parent Project (Optional)
                  </Label>
                  <Select
                    value={parentProjectId || "none"}
                    onValueChange={(value) =>
                      setParentProjectId(value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger id="parent-project">
                      <SelectValue placeholder="No parent (root project)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        No parent (root project)
                      </SelectItem>
                      {projects
                        .filter(
                          (p) => !editingProject || p.id !== editingProject.id,
                        )
                        .map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="team">Team (Optional)</Label>
                  <Select
                    value={teamId || "none"}
                    onValueChange={(value) =>
                      setTeamId(value === "none" ? null : value)
                    }
                  >
                    <SelectTrigger id="team">
                      <SelectValue placeholder="No team assigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team assigned</SelectItem>
                      {teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: team.color }}
                            />
                            {team.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  disabled={isCreating || !name}
                >
                  {isCreating ? "Creating..." : "Create Project"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Projects List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Get started by creating your first project
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {projectTree.rootProjects.map((project) => (
              <ProjectTreeItem
                key={project.id}
                project={project}
                childProjects={projectTree.getChildren(project.id)}
                level={0}
                onEditClick={handleEditClick}
                onDeleteClick={setDeletingProject}
                onCreateSubProject={handleCreateSubProject}
                getChildren={projectTree.getChildren}
                teams={teams}
              />
            ))}
          </div>
        )}

        {/* Old grid view - keeping as backup */}
        {false && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card
                key={project.id}
                className="hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FolderKanban className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {project.name}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={
                              project.status === "active"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {project.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleEditClick(project)}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingProject(project)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                {project.description && (
                  <CardContent>
                    <CardDescription className="line-clamp-2">
                      {project.description}
                    </CardDescription>
                    {(project.start_date || project.end_date) && (
                      <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {project.start_date && (
                          <span>
                            {new Date(project.start_date).toLocaleDateString()}
                          </span>
                        )}
                        {project.start_date && project.end_date && " - "}
                        {project.end_date && (
                          <span>
                            {new Date(project.end_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        {/* Edit Project Dialog */}
        <Dialog
          open={!!editingProject}
          onOpenChange={(open) => !open && setEditingProject(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit project</DialogTitle>
              <DialogDescription>
                Update your project information.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-project-name">Project Name *</Label>
                <Input
                  id="edit-project-name"
                  placeholder="My Awesome Project"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-project-description">Description</Label>
                <Textarea
                  id="edit-project-description"
                  placeholder="Describe your project..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCreating}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-parent-project">Parent Project</Label>
                <Select
                  value={parentProjectId || "none"}
                  onValueChange={(value) =>
                    setParentProjectId(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger id="edit-parent-project">
                    <SelectValue placeholder="No parent (root project)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      No parent (root project)
                    </SelectItem>
                    {projects
                      .filter(
                        (p) => !editingProject || p.id !== editingProject.id,
                      )
                      .map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-team">Team</Label>
                <Select
                  value={teamId || "none"}
                  onValueChange={(value) =>
                    setTeamId(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger id="edit-team">
                    <SelectValue placeholder="No team assigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No team assigned</SelectItem>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: team.color }}
                          />
                          {team.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingProject(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateProject}
                disabled={isCreating || !name}
              >
                {isCreating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingProject}
          onOpenChange={(open) => !open && setDeletingProject(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the project &quot;
                {deletingProject?.name}&quot;. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AuthGuard>
  );
}
