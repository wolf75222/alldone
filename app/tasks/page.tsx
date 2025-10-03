"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  useTasks,
  createTask,
  updateTask,
  deleteTask,
} from "@/lib/hooks/use-tasks";
import { useAuth } from "@/lib/hooks/use-auth";
import { useWorkspace } from "@/lib/context/workspace-context";
import { useWorkspaceMembers } from "@/lib/hooks/use-workspace-members";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTeams } from "@/lib/hooks/use-teams";
import { useMilestones } from "@/lib/hooks/use-milestones";
import {
  useTaskRelations,
  getTaskRelationWarnings,
} from "@/lib/hooks/use-task-relations";
import {
  calculateCriticalPath,
  getDependencyConnections,
} from "@/lib/utils/critical-path";
import { AuthGuard } from "@/components/auth-guard";
import { TaskTreeItem } from "@/components/task-tree-item";
import { TaskRelations } from "@/components/task-relations";
import { DatePicker } from "@/components/ui/date-picker";
import { Database } from "@/lib/types/database.types";

type Task = Database["public"]["Tables"]["tasks"]["Row"];
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  MoreVertical,
  ListTodo,
  Trash2,
  Edit,
  Calendar as CalendarIcon,
  User,
  List,
  TableIcon,
  Filter,
  SortAsc,
  Network,
  Folder,
  LayoutGrid,
  GanttChartSquare,
  AlertCircle,
  AlertTriangle,
  Info,
  Target,
  Flag,
} from "lucide-react";
import {
  ListProvider,
  ListGroup,
  ListHeader,
  ListItems,
  ListItem,
  type DragEndEvent,
} from "@/components/ui/shadcn-io/list";
import {
  KanbanProvider,
  KanbanBoard,
  KanbanHeader,
  KanbanCards,
  KanbanCard,
} from "@/components/ui/shadcn-io/kanban";
import {
  GanttProvider,
  GanttTimeline,
  GanttHeader,
  GanttFeatureList,
  GanttFeatureItem,
  GanttToday,
  GanttMilestones,
  GanttDependencyArrows,
  type GanttFeature,
  type Milestone,
} from "@/components/ui/shadcn-io/gantt";

const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
const STATUSES = ["todo", "in_progress", "done", "cancelled"] as const;

const PRIORITY_COLORS = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  medium:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const STATUS_COLORS = {
  todo: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  done: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

type ViewMode = "list" | "table" | "tree" | "kanban" | "gantt";

export default function TasksPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { tasks, loading } = useTasks(workspace?.id);
  const { members } = useWorkspaceMembers(workspace?.id);
  const { projects } = useProjects(workspace?.id);
  const { teams } = useTeams(workspace?.id);
  const { relations } = useTaskRelations(workspace?.id);
  const { milestones } = useMilestones(workspace?.id);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] =
    useState<(typeof PRIORITIES)[number]>("medium");
  const [status, setStatus] = useState<string>("todo");
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [parentTaskId, setParentTaskId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [migrationError, setMigrationError] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [kanbanGroupBy, setKanbanGroupBy] = useState<
    "none" | "assignee" | "priority" | "project"
  >("none");
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [showDependencies, setShowDependencies] = useState(true);
  const [showMilestones, setShowMilestones] = useState(true);

  // Redirect to workspaces if no workspace selected
  useEffect(() => {
    if (!workspaceLoading && !workspace) {
      router.push("/workspaces");
    }
  }, [workspace, workspaceLoading, router]);

  // Build task tree hierarchy
  const taskTree = useMemo(() => {
    const rootTasks = tasks.filter((t) => !t.parent_task_id);
    const getChildren = (parentId: string) => {
      return tasks.filter((t) => t.parent_task_id === parentId);
    };
    return { rootTasks, getChildren };
  }, [tasks]);

  // Filter and sort tasks
  // Get all sub-project IDs recursively
  const getProjectAndSubProjects = useMemo(() => {
    const getSubProjectIds = (projectId: string): string[] => {
      const subProjects = projects.filter((p) => p.parent_id === projectId);
      const allIds = [projectId];
      subProjects.forEach((sub) => {
        allIds.push(...getSubProjectIds(sub.id));
      });
      return allIds;
    };
    return getSubProjectIds;
  }, [projects]);

  const filteredAndSortedTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by status
    if (filterStatus !== "all") {
      result = result.filter((task) => task.status === filterStatus);
    }

    // Filter by priority
    if (filterPriority !== "all") {
      result = result.filter((task) => task.priority === filterPriority);
    }

    // Filter by project (includes sub-projects)
    if (filterProject !== "all") {
      if (filterProject === "none") {
        // Show tasks with no project
        result = result.filter((task) => !task.project_id);
      } else {
        // Show tasks from this project and all its sub-projects
        const projectIds = getProjectAndSubProjects(filterProject);
        result = result.filter(
          (task) => task.project_id && projectIds.includes(task.project_id),
        );
      }
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "title":
          return a.title.localeCompare(b.title);
        case "priority":
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (
            (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) -
            (priorityOrder[a.priority as keyof typeof priorityOrder] || 0)
          );
        case "status":
          return a.status.localeCompare(b.status);
        case "created_at":
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
      }
    });

    return result;
  }, [
    tasks,
    filterStatus,
    filterPriority,
    filterProject,
    sortBy,
    getProjectAndSubProjects,
  ]);

  // Group tasks by status for list view
  const tasksByStatus = useMemo(() => {
    const groups: Record<string, typeof tasks> = {
      todo: [],
      in_progress: [],
      done: [],
      cancelled: [],
    };

    filteredAndSortedTasks.forEach((task) => {
      if (groups[task.status]) {
        groups[task.status].push(task);
      }
    });

    return groups;
  }, [filteredAndSortedTasks]);

  async function handleCreateTask() {
    if (!title) {
      setError("Task title is required");
      return;
    }

    if (!workspace) {
      setError("No workspace selected");
      return;
    }

    // Validate dates
    if (startDate && dueDate && startDate.getTime() > dueDate.getTime()) {
      setError("Start date must be before or equal to due date");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await createTask({
        title,
        description: description || null,
        workspace_id: workspace.id,
        project_id: projectId,
        team_id: teamId,
        created_by: user!.id,
        status,
        priority,
        assignee_id: assigneeId,
        start_date: startDate ? startDate.toISOString() : null,
        due_date: dueDate ? dueDate.toISOString() : null,
        parent_task_id: parentTaskId,
      });

      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("todo");
      setAssigneeId(null);
      setStartDate(undefined);
      setDueDate(undefined);
      setParentTaskId(null);
      setProjectId(null);
      setTeamId(null);
      setIsDialogOpen(false);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to create task";
      setError(errorMsg);
      if (errorMsg.includes("migration")) {
        setMigrationError(true);
      }
    } finally {
      setIsCreating(false);
    }
  }

  function handleEditClick(task: Task) {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || "");
    setPriority(task.priority || "medium");
    setStatus(task.status);
    setAssigneeId(task.assignee_id || null);
    setStartDate(task.start_date ? new Date(task.start_date) : undefined);
    setDueDate(task.due_date ? new Date(task.due_date) : undefined);
    setParentTaskId(task.parent_task_id || null);
    setProjectId(task.project_id || null);
    setTeamId(task.team_id || null);
    setError(null);
  }

  function handleCreateSubTask(parentId: string) {
    setParentTaskId(parentId);
    setTitle("");
    setDescription("");
    setPriority("medium");
    setStatus("todo");
    setAssigneeId(null);
    setDueDate(undefined);
    setIsDialogOpen(true);
  }

  async function handleUpdateTask() {
    if (!title || !editingTask) {
      setError("Task title is required");
      return;
    }

    // Validate dates
    if (startDate && dueDate && startDate.getTime() > dueDate.getTime()) {
      setError("Start date must be before or equal to due date");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      await updateTask(editingTask.id, {
        title,
        description: description || null,
        priority,
        status,
        assignee_id: assigneeId,
        start_date: startDate ? startDate.toISOString() : null,
        due_date: dueDate ? dueDate.toISOString() : null,
        parent_task_id: parentTaskId,
        project_id: projectId,
        team_id: teamId,
      });

      setTitle("");
      setDescription("");
      setPriority("medium");
      setStatus("todo");
      setAssigneeId(null);
      setStartDate(undefined);
      setDueDate(undefined);
      setParentTaskId(null);
      setTeamId(null);
      setEditingTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update task");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleConfirmDelete() {
    if (!deletingTask) return;

    try {
      await deleteTask(deletingTask.id);
      setDeletingTask(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete task");
    }
  }

  async function handleToggleTaskStatus(id: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === "done" ? "todo" : "done";
      await updateTask(id, { status: newStatus });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update task");
    }
  }

  function toggleTaskSelection(taskId: string) {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  }

  function toggleAllTasks() {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)));
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const taskId = active.id as string;
    const newStatus = over.id as string;

    try {
      await updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error("Failed to update task status:", err);
    }
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Migration Alert */}
        {migrationError && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">
                  Database Migration Required
                </h3>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                  The Gantt view and task scheduling features require a database
                  migration. Run the migration to enable these features.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-yellow-600 text-yellow-700 hover:bg-yellow-100 dark:text-yellow-300 dark:hover:bg-yellow-900/40"
                    onClick={() =>
                      window.open("IMPORTANT_MIGRATION_NEEDED.md", "_blank")
                    }
                  >
                    View Migration Instructions
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setMigrationError(false)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Tasks</h1>
            <p className="text-muted-foreground">
              Track and manage all your tasks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create a new task</DialogTitle>
                  <DialogDescription>
                    Add a new task to track your work.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="task-title">Title *</Label>
                    <Input
                      id="task-title"
                      placeholder="Fix bug in login page"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="task-description">Description</Label>
                    <Textarea
                      id="task-description"
                      placeholder="Describe the task..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isCreating}
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="task-status">Status</Label>
                      <Select value={status} onValueChange={setStatus}>
                        <SelectTrigger id="task-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="task-priority">Priority</Label>
                      <Select
                        value={priority}
                        onValueChange={(v) =>
                          setPriority(v as (typeof PRIORITIES)[number])
                        }
                      >
                        <SelectTrigger id="task-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Popover
                      open={projectPopoverOpen}
                      onOpenChange={setProjectPopoverOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start"
                        >
                          {projectId ? (
                            <div className="flex items-center gap-2">
                              <Folder className="h-4 w-4" />
                              {projects.find((p) => p.id === projectId)?.name}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              No project
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search projects..." />
                          <CommandList>
                            <CommandEmpty>No projects found.</CommandEmpty>
                            <CommandGroup>
                              <CommandItem
                                onSelect={() => {
                                  setProjectId(null);
                                  setProjectPopoverOpen(false);
                                }}
                              >
                                <Folder className="mr-2 h-4 w-4" />
                                No project
                              </CommandItem>
                              {projects.map((project) => (
                                <CommandItem
                                  key={project.id}
                                  onSelect={() => {
                                    setProjectId(project.id);
                                    setProjectPopoverOpen(false);
                                  }}
                                >
                                  <Folder className="mr-2 h-4 w-4" />
                                  {project.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Assignee</Label>
                      <Popover
                        open={assigneePopoverOpen}
                        onOpenChange={setAssigneePopoverOpen}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start"
                          >
                            {assigneeId ? (
                              <span>
                                {members.find((m) => m.user_id === assigneeId)
                                  ?.user.full_name ||
                                  members.find((m) => m.user_id === assigneeId)
                                    ?.user.email}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                Unassigned
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search members..." />
                            <CommandList>
                              <CommandEmpty>No members found.</CommandEmpty>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => {
                                    setAssigneeId(null);
                                    setAssigneePopoverOpen(false);
                                  }}
                                >
                                  <User className="mr-2 h-4 w-4" />
                                  Unassigned
                                </CommandItem>
                                {members.map((member) => (
                                  <CommandItem
                                    key={member.user_id}
                                    onSelect={() => {
                                      setAssigneeId(member.user_id);
                                      setAssigneePopoverOpen(false);
                                    }}
                                  >
                                    <User className="mr-2 h-4 w-4" />
                                    {member.user.full_name || member.user.email}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <DatePicker
                        date={startDate}
                        onDateChange={setStartDate}
                        placeholder="No start date"
                        disabled={isCreating}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <DatePicker
                        date={dueDate}
                        onDateChange={setDueDate}
                        placeholder="No due date"
                        disabled={isCreating}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parent-task">Parent Task (Optional)</Label>
                    <Select
                      value={parentTaskId || "none"}
                      onValueChange={(value) =>
                        setParentTaskId(value === "none" ? null : value)
                      }
                    >
                      <SelectTrigger id="parent-task">
                        <SelectValue placeholder="No parent (root task)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          No parent (root task)
                        </SelectItem>
                        {tasks
                          .filter(
                            (t) => !editingTask || t.id !== editingTask.id,
                          )
                          .map((task) => (
                            <SelectItem key={task.id} value={task.id}>
                              {task.title}
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
                    onClick={handleCreateTask}
                    disabled={isCreating || !title}
                  >
                    {isCreating ? "Creating..." : "Create Task"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters and View Switcher */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Status:{" "}
                  {filterStatus === "all"
                    ? "All"
                    : filterStatus.replace("_", " ")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                  All
                </DropdownMenuItem>
                {STATUSES.map((s) => (
                  <DropdownMenuItem key={s} onClick={() => setFilterStatus(s)}>
                    {s.replace("_", " ")}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  Priority: {filterPriority === "all" ? "All" : filterPriority}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterPriority("all")}>
                  All
                </DropdownMenuItem>
                {PRIORITIES.map((p) => (
                  <DropdownMenuItem
                    key={p}
                    onClick={() => setFilterPriority(p)}
                  >
                    {p}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Folder className="mr-2 h-4 w-4" />
                  Project:{" "}
                  {filterProject === "all"
                    ? "All"
                    : filterProject === "none"
                      ? "No project"
                      : projects.find((p) => p.id === filterProject)?.name ||
                        "Unknown"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setFilterProject("all")}>
                  All projects
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterProject("none")}>
                  No project
                </DropdownMenuItem>
                {projects
                  .filter((p) => !p.parent_id)
                  .map((project) => (
                    <DropdownMenuItem
                      key={project.id}
                      onClick={() => setFilterProject(project.id)}
                    >
                      {project.name}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <SortAsc className="mr-2 h-4 w-4" />
                  Sort: {sortBy.replace("_", " ")}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy("created_at")}>
                  Date created
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("title")}>
                  Title
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("priority")}>
                  Priority
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("status")}>
                  Status
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Tabs
            value={viewMode}
            onValueChange={(v) => setViewMode(v as ViewMode)}
          >
            <TabsList>
              <TabsTrigger value="list">
                <List className="mr-2 h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="table">
                <TableIcon className="mr-2 h-4 w-4" />
                Table
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <LayoutGrid className="mr-2 h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="gantt">
                <GanttChartSquare className="mr-2 h-4 w-4" />
                Gantt
              </TabsTrigger>
              <TabsTrigger value="tree">
                <Network className="mr-2 h-4 w-4" />
                Tree
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {viewMode === "kanban" && (
            <div className="flex items-center gap-2">
              <Label className="text-sm">Group by:</Label>
              <Select
                value={kanbanGroupBy}
                onValueChange={(v) =>
                  setKanbanGroupBy(v as typeof kanbanGroupBy)
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Status)</SelectItem>
                  <SelectItem value="assignee">Assignee</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {viewMode === "gantt" && (
            <div className="flex items-center gap-2">
              <Button
                variant={showCriticalPath ? "default" : "outline"}
                size="sm"
                onClick={() => setShowCriticalPath(!showCriticalPath)}
              >
                <Target className="mr-2 h-4 w-4" />
                Critical Path
              </Button>
              <Button
                variant={showDependencies ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDependencies(!showDependencies)}
              >
                <Network className="mr-2 h-4 w-4" />
                Dependencies
              </Button>
              <Button
                variant={showMilestones ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMilestones(!showMilestones)}
              >
                <Flag className="mr-2 h-4 w-4" />
                Milestones
              </Button>
            </div>
          )}
        </div>

        {/* Tasks Views */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <ListTodo className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Get started by creating your first task
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Task
            </Button>
          </div>
        ) : viewMode === "list" ? (
          <ListProvider onDragEnd={handleDragEnd}>
            {Object.entries(tasksByStatus).map(([status, statusTasks]) => (
              <ListGroup key={status} id={status}>
                <ListHeader
                  name={status.replace("_", " ").toUpperCase()}
                  color={
                    status === "todo"
                      ? "#6b7280"
                      : status === "in_progress"
                        ? "#3b82f6"
                        : status === "done"
                          ? "#10b981"
                          : "#ef4444"
                  }
                />
                <ListItems>
                  {statusTasks.map((task, index) => {
                    const depth = (() => {
                      let d = 0;
                      let currentTask = task;
                      while (currentTask.parent_task_id) {
                        d++;
                        currentTask =
                          tasks.find(
                            (t) => t.id === currentTask.parent_task_id,
                          ) || currentTask;
                        if (d > 10) break;
                      }
                      return d;
                    })();
                    const parentTask = task.parent_task_id
                      ? tasks.find((t) => t.id === task.parent_task_id)
                      : null;
                    const warnings = getTaskRelationWarnings(
                      task.id,
                      task.status,
                      relations,
                      tasks,
                    );
                    return (
                      <ListItem
                        key={task.id}
                        id={task.id}
                        name={task.title}
                        index={index}
                        parent={status}
                      >
                        <div className="flex flex-col gap-1 w-full">
                          <div
                            className={`flex items-center justify-between w-full gap-2 ${depth > 0 ? "border-l-2 border-muted pl-4" : ""}`}
                            style={{ marginLeft: `${depth * 16}px` }}
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Checkbox
                                checked={task.status === "done"}
                                onCheckedChange={() =>
                                  handleToggleTaskStatus(task.id, task.status)
                                }
                              />
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {parentTask && (
                                  <Badge
                                    variant="outline"
                                    className="text-xs shrink-0"
                                  >
                                    <span className="truncate max-w-[120px]">
                                      {parentTask.title}
                                    </span>
                                  </Badge>
                                )}
                                <span
                                  className={`font-medium text-sm truncate ${task.status === "done" ? "line-through text-muted-foreground" : ""}`}
                                >
                                  {task.title}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {warnings.length > 0 && (
                                <div className="flex items-center gap-1">
                                  {warnings.some((w) => w.type === "error") && (
                                    <AlertCircle className="h-4 w-4 text-destructive" />
                                  )}
                                  {warnings.some((w) => w.type === "warning") &&
                                    !warnings.some(
                                      (w) => w.type === "error",
                                    ) && (
                                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    )}
                                </div>
                              )}
                              {task.priority && (
                                <Badge
                                  variant="outline"
                                  className={PRIORITY_COLORS[task.priority]}
                                >
                                  {task.priority}
                                </Badge>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleEditClick(task)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeletingTask(task)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                          {warnings.length > 0 && (
                            <div className="flex flex-col gap-1 text-xs pl-8">
                              {warnings.map((warning, idx) => (
                                <div
                                  key={idx}
                                  className={`flex items-center gap-1 ${
                                    warning.type === "error"
                                      ? "text-destructive"
                                      : warning.type === "warning"
                                        ? "text-yellow-600 dark:text-yellow-500"
                                        : "text-blue-600 dark:text-blue-400"
                                  }`}
                                >
                                  {warning.type === "error" && (
                                    <AlertCircle className="h-3 w-3" />
                                  )}
                                  {warning.type === "warning" && (
                                    <AlertTriangle className="h-3 w-3" />
                                  )}
                                  {warning.type === "info" && (
                                    <Info className="h-3 w-3" />
                                  )}
                                  <span>{warning.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </ListItem>
                    );
                  })}
                  {statusTasks.length === 0 && (
                    <div className="text-sm text-muted-foreground p-4 text-center">
                      No tasks
                    </div>
                  )}
                </ListItems>
              </ListGroup>
            ))}
          </ListProvider>
        ) : viewMode === "table" ? (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        selectedTasks.size === filteredAndSortedTasks.length
                      }
                      onCheckedChange={toggleAllTasks}
                    />
                  </TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-40">Project</TableHead>
                  <TableHead className="w-28">Team</TableHead>
                  <TableHead className="w-32">Status</TableHead>
                  <TableHead className="w-28">Priority</TableHead>
                  <TableHead className="w-32">Assignee</TableHead>
                  <TableHead className="w-32">Due Date</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTasks.map((task) => {
                  const depth = (() => {
                    let d = 0;
                    let currentTask = task;
                    while (currentTask.parent_task_id) {
                      d++;
                      currentTask =
                        tasks.find(
                          (t) => t.id === currentTask.parent_task_id,
                        ) || currentTask;
                      if (d > 10) break;
                    }
                    return d;
                  })();
                  return (
                    <TableRow key={task.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedTasks.has(task.id)}
                          onCheckedChange={() => toggleTaskSelection(task.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${depth * 24}px` }}
                        >
                          {depth > 0 && (
                            <span className="text-muted-foreground text-xs">
                              └─
                            </span>
                          )}
                          <Checkbox
                            checked={task.status === "done"}
                            onCheckedChange={() =>
                              handleToggleTaskStatus(task.id, task.status)
                            }
                          />
                          <span
                            className={
                              task.status === "done"
                                ? "line-through text-muted-foreground"
                                : ""
                            }
                          >
                            {task.title}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.project_id ? (
                          <Badge variant="secondary" className="gap-1">
                            <Folder className="h-3 w-3" />
                            {projects.find((p) => p.id === task.project_id)
                              ?.name || "Unknown"}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            No project
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.team_id ? (
                          <Badge variant="secondary" className="text-xs">
                            <div className="flex items-center gap-1">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    teams.find((t) => t.id === task.team_id)
                                      ?.color || "#3b82f6",
                                }}
                              />
                              {teams.find((t) => t.id === task.team_id)?.name ||
                                "Team"}
                            </div>
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            STATUS_COLORS[
                              task.status as keyof typeof STATUS_COLORS
                            ] || ""
                          }
                        >
                          {task.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.priority && (
                          <Badge
                            variant="outline"
                            className={PRIORITY_COLORS[task.priority]}
                          >
                            {task.priority}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.assignee_id ? (
                          <span className="text-sm">
                            {members.find((m) => m.user_id === task.assignee_id)
                              ?.user.full_name ||
                              members.find(
                                (m) => m.user_id === task.assignee_id,
                              )?.user.email ||
                              "Assigned"}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {task.due_date ? (
                          <div className="flex items-center gap-2 text-sm">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditClick(task)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeletingTask(task)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : viewMode === "kanban" ? (
          <div className="h-[600px]">
            <KanbanProvider
              columns={(() => {
                if (kanbanGroupBy === "assignee") {
                  const assignees = Array.from(
                    new Set(
                      filteredAndSortedTasks.map(
                        (t) => t.assignee_id || "unassigned",
                      ),
                    ),
                  );
                  return assignees.map((assigneeId) => ({
                    id: assigneeId,
                    name:
                      assigneeId === "unassigned"
                        ? "Unassigned"
                        : members.find((m) => m.user_id === assigneeId)?.user
                            .full_name ||
                          members.find((m) => m.user_id === assigneeId)?.user
                            .email ||
                          "Unknown",
                  }));
                } else if (kanbanGroupBy === "priority") {
                  return [
                    { id: "urgent", name: "Urgent" },
                    { id: "high", name: "High" },
                    { id: "medium", name: "Medium" },
                    { id: "low", name: "Low" },
                    { id: "none", name: "No Priority" },
                  ];
                } else if (kanbanGroupBy === "project") {
                  const projectIds = Array.from(
                    new Set(
                      filteredAndSortedTasks.map((t) => t.project_id || "none"),
                    ),
                  );
                  return projectIds.map((projectId) => ({
                    id: projectId,
                    name:
                      projectId === "none"
                        ? "No Project"
                        : projects.find((p) => p.id === projectId)?.name ||
                          "Unknown",
                  }));
                }
                return [
                  { id: "todo", name: "To Do" },
                  { id: "in_progress", name: "In Progress" },
                  { id: "done", name: "Done" },
                  { id: "cancelled", name: "Cancelled" },
                ];
              })()}
              data={filteredAndSortedTasks.map((task) => ({
                id: task.id,
                name: task.title,
                column: (() => {
                  if (kanbanGroupBy === "assignee") {
                    return task.assignee_id || "unassigned";
                  } else if (kanbanGroupBy === "priority") {
                    return task.priority || "none";
                  } else if (kanbanGroupBy === "project") {
                    return task.project_id || "none";
                  }
                  return task.status;
                })(),
                task,
              }))}
              onDataChange={(data) => {
                const movedItem = data.find((item) => {
                  if (kanbanGroupBy === "assignee") {
                    return (
                      item.column !== (item.task.assignee_id || "unassigned")
                    );
                  } else if (kanbanGroupBy === "priority") {
                    return item.column !== (item.task.priority || "none");
                  } else if (kanbanGroupBy === "project") {
                    return item.column !== (item.task.project_id || "none");
                  }
                  return item.column !== item.task.status;
                });

                if (movedItem) {
                  if (kanbanGroupBy === "assignee") {
                    updateTask(movedItem.id, {
                      assignee_id:
                        movedItem.column === "unassigned"
                          ? null
                          : movedItem.column,
                    });
                  } else if (kanbanGroupBy === "priority") {
                    updateTask(movedItem.id, {
                      priority:
                        movedItem.column === "none"
                          ? null
                          : (movedItem.column as (typeof PRIORITIES)[number]),
                    });
                  } else if (kanbanGroupBy === "project") {
                    updateTask(movedItem.id, {
                      project_id:
                        movedItem.column === "none" ? null : movedItem.column,
                    });
                  } else {
                    updateTask(movedItem.id, { status: movedItem.column });
                  }
                }
              }}
            >
              {(column) => (
                <KanbanBoard id={column.id} key={column.id}>
                  <KanbanHeader className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>{column.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {
                          filteredAndSortedTasks.filter((t) => {
                            if (kanbanGroupBy === "assignee") {
                              return (
                                (t.assignee_id || "unassigned") === column.id
                              );
                            } else if (kanbanGroupBy === "priority") {
                              return (t.priority || "none") === column.id;
                            } else if (kanbanGroupBy === "project") {
                              return (t.project_id || "none") === column.id;
                            }
                            return t.status === column.id;
                          }).length
                        }
                      </Badge>
                    </div>
                  </KanbanHeader>
                  <KanbanCards id={column.id}>
                    {(item) => {
                      const parentTask = item.task.parent_task_id
                        ? tasks.find((t) => t.id === item.task.parent_task_id)
                        : null;
                      const warnings = getTaskRelationWarnings(
                        item.task.id,
                        item.task.status,
                        relations,
                        tasks,
                      );
                      return (
                        <KanbanCard key={item.id} {...item}>
                          <div className="space-y-2">
                            {parentTask && (
                              <div className="flex items-center gap-1 pb-1 border-b border-muted">
                                <Badge
                                  variant="secondary"
                                  className="text-xs font-normal"
                                >
                                  {parentTask.title}
                                </Badge>
                              </div>
                            )}
                            <p className="font-medium text-sm">{item.name}</p>
                            {warnings.length > 0 && (
                              <div className="flex flex-col gap-1">
                                {warnings.map((warning, idx) => (
                                  <div
                                    key={idx}
                                    className={`flex items-center gap-1 text-xs ${
                                      warning.type === "error"
                                        ? "text-destructive"
                                        : warning.type === "warning"
                                          ? "text-yellow-600 dark:text-yellow-500"
                                          : "text-blue-600 dark:text-blue-400"
                                    }`}
                                  >
                                    {warning.type === "error" && (
                                      <AlertCircle className="h-3 w-3" />
                                    )}
                                    {warning.type === "warning" && (
                                      <AlertTriangle className="h-3 w-3" />
                                    )}
                                    {warning.type === "info" && (
                                      <Info className="h-3 w-3" />
                                    )}
                                    <span className="truncate">
                                      {warning.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-2 flex-wrap">
                              {item.task.priority && (
                                <Badge
                                  variant="outline"
                                  className={
                                    PRIORITY_COLORS[item.task.priority]
                                  }
                                >
                                  {item.task.priority}
                                </Badge>
                              )}
                              {item.task.assignee_id && (
                                <span className="text-xs text-muted-foreground">
                                  {members.find(
                                    (m) => m.user_id === item.task.assignee_id,
                                  )?.user.full_name ||
                                    members.find(
                                      (m) =>
                                        m.user_id === item.task.assignee_id,
                                    )?.user.email ||
                                    "Assigned"}
                                </span>
                              )}
                            </div>
                            <div className="flex gap-1 pt-2 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditClick(item.task)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeletingTask(item.task)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </KanbanCard>
                      );
                    }}
                  </KanbanCards>
                </KanbanBoard>
              )}
            </KanbanProvider>
          </div>
        ) : viewMode === "gantt" ? (
          <div className="space-y-4">
            {tasks.filter((task) => task.start_date && task.due_date).length ===
            0 ? (
              <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">
                  No tasks with dates
                </h3>
                <p className="text-sm mb-4">
                  Tasks need both start and due dates to appear in Gantt view
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task with Dates
                </Button>
              </div>
            ) : (
              <>
                {/* Calculate critical path if enabled */}
                {(() => {
                  const tasksWithDates = tasks.filter(
                    (t) => t.start_date && t.due_date,
                  );
                  const criticalPathIds = showCriticalPath
                    ? calculateCriticalPath(tasksWithDates, relations)
                    : [];
                  const dependencies = getDependencyConnections(
                    tasksWithDates,
                    relations,
                  );

                  return (
                    <>
                      {/* Info bar */}
                      {(showCriticalPath || showDependencies) && (
                        <div className="flex items-center gap-4 px-4 py-2 bg-muted rounded-lg text-sm">
                          {showCriticalPath && criticalPathIds.length > 0 && (
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-red-500" />
                              <span>
                                Critical Path: {criticalPathIds.length} task(s)
                              </span>
                            </div>
                          )}
                          {showDependencies && dependencies.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Network className="h-4 w-4" />
                              <span>
                                {dependencies.length} dependenc
                                {dependencies.length === 1 ? "y" : "ies"}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      <GanttProvider
                        className="border rounded-lg overflow-hidden"
                        range="monthly"
                        zoom={100}
                        onAddItem={(date) => {
                          try {
                            setStartDate(date);
                            setDueDate(
                              new Date(
                                date.getTime() + 7 * 24 * 60 * 60 * 1000,
                              ),
                            );
                            setIsDialogOpen(true);
                          } catch (err) {
                            console.error("Error in onAddItem:", err);
                          }
                        }}
                      >
                        <GanttTimeline className="h-[600px]">
                          <GanttHeader />
                          <GanttFeatureList>
                            {tasks
                              .filter(
                                (task) => task.start_date && task.due_date,
                              )
                              .map((task) => {
                                try {
                                  const assignee = members.find(
                                    (m) => m.user_id === task.assignee_id,
                                  );
                                  const project = projects.find(
                                    (p) => p.id === task.project_id,
                                  );

                                  const startDate = new Date(task.start_date!);
                                  const endDate = new Date(task.due_date!);

                                  // Validate dates
                                  if (
                                    isNaN(startDate.getTime()) ||
                                    isNaN(endDate.getTime())
                                  ) {
                                    console.error(
                                      "Invalid dates for task:",
                                      task.id,
                                      task.title,
                                    );
                                    return null;
                                  }

                                  // Check if task is on critical path
                                  const isOnCriticalPath =
                                    showCriticalPath &&
                                    criticalPathIds.includes(task.id);

                                  const feature: GanttFeature = {
                                    id: task.id,
                                    name: task.title,
                                    startAt: startDate,
                                    endAt: endDate,
                                    status: {
                                      id: task.status,
                                      name: task.status.replace("_", " "),
                                      color: isOnCriticalPath
                                        ? "#dc2626" // Red for critical path
                                        : task.status === "done"
                                          ? "#22c55e"
                                          : task.status === "in_progress"
                                            ? "#3b82f6"
                                            : task.status === "cancelled"
                                              ? "#ef4444"
                                              : "#6b7280",
                                    },
                                  };
                                  return (
                                    <ContextMenu key={task.id}>
                                      <ContextMenuTrigger asChild>
                                        <div>
                                          <GanttFeatureItem
                                            {...feature}
                                            onMove={async (
                                              id,
                                              startAt,
                                              endAt,
                                            ) => {
                                              try {
                                                if (endAt && startAt) {
                                                  // Validate that startAt <= endAt
                                                  if (
                                                    startAt.getTime() >
                                                    endAt.getTime()
                                                  ) {
                                                    console.warn(
                                                      "Invalid date range: startAt > endAt, swapping dates",
                                                    );
                                                    // Swap dates if start is after end
                                                    const temp = startAt;
                                                    startAt = endAt;
                                                    endAt = temp;
                                                  }

                                                  console.log(
                                                    "Moving task:",
                                                    id,
                                                    "from",
                                                    startAt,
                                                    "to",
                                                    endAt,
                                                  );
                                                  await updateTask(id, {
                                                    start_date:
                                                      startAt.toISOString(),
                                                    due_date:
                                                      endAt.toISOString(),
                                                  });
                                                }
                                              } catch (err) {
                                                console.error(
                                                  "Error moving task:",
                                                  err,
                                                );
                                                const errorMsg =
                                                  err &&
                                                  typeof err === "object" &&
                                                  "message" in err
                                                    ? String(err.message)
                                                    : "Failed to move task";
                                                setError(errorMsg);
                                              }
                                            }}
                                          >
                                            <div className="flex items-center gap-2 w-full min-w-0">
                                              <span className="truncate text-xs flex-1">
                                                {project && (
                                                  <span className="text-muted-foreground">
                                                    {project.name} /{" "}
                                                  </span>
                                                )}
                                                {task.title}
                                              </span>
                                              {assignee && (
                                                <Avatar className="h-4 w-4 shrink-0">
                                                  <AvatarFallback className="text-[10px]">
                                                    {(
                                                      assignee.user.full_name ||
                                                      assignee.user.email
                                                    )
                                                      ?.charAt(0)
                                                      .toUpperCase()}
                                                  </AvatarFallback>
                                                </Avatar>
                                              )}
                                            </div>
                                          </GanttFeatureItem>
                                        </div>
                                      </ContextMenuTrigger>
                                      <ContextMenuContent>
                                        <ContextMenuItem
                                          className="flex items-center gap-2"
                                          onClick={() => handleEditClick(task)}
                                        >
                                          <Edit className="h-4 w-4" />
                                          Edit task
                                        </ContextMenuItem>
                                        <ContextMenuItem
                                          className="flex items-center gap-2 text-destructive"
                                          onClick={() => setDeletingTask(task)}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Delete task
                                        </ContextMenuItem>
                                      </ContextMenuContent>
                                    </ContextMenu>
                                  );
                                } catch (err) {
                                  console.error(
                                    "Error rendering Gantt item for task:",
                                    task.id,
                                    err,
                                  );
                                  return null;
                                }
                              })
                              .filter(Boolean)}
                          </GanttFeatureList>
                          <GanttToday />
                          {/* Milestones display */}
                          {showMilestones && milestones.length > 0 && (
                            <GanttMilestones
                              milestones={milestones as Milestone[]}
                            />
                          )}
                          {/* Dependency arrows */}
                          {showDependencies && dependencies.length > 0 && (
                            <GanttDependencyArrows
                              dependencies={dependencies.map((dep) => ({
                                id: dep.id,
                                sourceTaskId: dep.source,
                                targetTaskId: dep.target,
                                relationType: dep.type as "blocks" | "depends",
                              }))}
                              tasks={tasksWithDates.map((task) => ({
                                id: task.id,
                                name: task.title,
                                startAt: new Date(task.start_date!),
                                endAt: new Date(task.due_date!),
                                status: {
                                  id: task.status,
                                  name: task.status,
                                  color:
                                    task.status === "done"
                                      ? "#22c55e"
                                      : task.status === "in_progress"
                                        ? "#3b82f6"
                                        : "#6b7280",
                                },
                              }))}
                            />
                          )}
                        </GanttTimeline>
                      </GanttProvider>
                    </>
                  );
                })()}
              </>
            )}
          </div>
        ) : viewMode === "tree" ? (
          <div className="space-y-2">
            {taskTree.rootTasks.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                No root tasks. All tasks have parent tasks.
              </div>
            ) : (
              taskTree.rootTasks.map((task) => (
                <TaskTreeItem
                  key={task.id}
                  task={task}
                  childTasks={taskTree.getChildren(task.id)}
                  level={0}
                  members={members}
                  onEditClick={handleEditClick}
                  onDeleteClick={setDeletingTask}
                  onCreateSubTask={handleCreateSubTask}
                  onToggleStatus={handleToggleTaskStatus}
                  getChildren={taskTree.getChildren}
                  priorityColors={PRIORITY_COLORS}
                  statusColors={STATUS_COLORS}
                  teams={teams}
                />
              ))
            )}
          </div>
        ) : null}

        {selectedTasks.size > 0 && viewMode !== "tree" && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-background border rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {selectedTasks.size} task(s) selected
              </span>
              <Button variant="outline" size="sm">
                Assign
              </Button>
              <Button variant="outline" size="sm">
                Change Status
              </Button>
              <Button variant="destructive" size="sm">
                Delete
              </Button>
            </div>
          </div>
        )}

        {/* Edit Task Dialog */}
        <Dialog
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit task</DialogTitle>
              <DialogDescription>
                Update your task information.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {error && (
                <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-task-title">Title *</Label>
                <Input
                  id="edit-task-title"
                  placeholder="Fix bug in login page"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isCreating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-description">Description</Label>
                <Textarea
                  id="edit-task-description"
                  placeholder="Describe the task..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isCreating}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-task-status">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="edit-task-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace("_", " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-task-priority">Priority</Label>
                  <Select
                    value={priority}
                    onValueChange={(v) =>
                      setPriority(v as (typeof PRIORITIES)[number])
                    }
                  >
                    <SelectTrigger id="edit-task-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assignee</Label>
                  <Popover
                    open={assigneePopoverOpen}
                    onOpenChange={setAssigneePopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start"
                      >
                        {assigneeId ? (
                          <span>
                            {members.find((m) => m.user_id === assigneeId)?.user
                              .full_name ||
                              members.find((m) => m.user_id === assigneeId)
                                ?.user.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search members..." />
                        <CommandList>
                          <CommandEmpty>No members found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => {
                                setAssigneeId(null);
                                setAssigneePopoverOpen(false);
                              }}
                            >
                              <User className="mr-2 h-4 w-4" />
                              Unassigned
                            </CommandItem>
                            {members.map((member) => (
                              <CommandItem
                                key={member.user_id}
                                onSelect={() => {
                                  setAssigneeId(member.user_id);
                                  setAssigneePopoverOpen(false);
                                }}
                              >
                                <User className="mr-2 h-4 w-4" />
                                {member.user.full_name || member.user.email}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <DatePicker
                    date={startDate}
                    onDateChange={setStartDate}
                    placeholder="No start date"
                    disabled={isCreating}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <DatePicker
                    date={dueDate}
                    onDateChange={setDueDate}
                    placeholder="No due date"
                    disabled={isCreating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-parent-task">Parent Task</Label>
                <Select
                  value={parentTaskId || "none"}
                  onValueChange={(value) =>
                    setParentTaskId(value === "none" ? null : value)
                  }
                >
                  <SelectTrigger id="edit-parent-task">
                    <SelectValue placeholder="No parent (root task)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent (root task)</SelectItem>
                    {tasks
                      .filter((t) => !editingTask || t.id !== editingTask.id)
                      .map((task) => (
                        <SelectItem key={task.id} value={task.id}>
                          {task.title}
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

              {/* Task Relations */}
              {editingTask && currentWorkspace && (
                <div className="pt-4 border-t">
                  <TaskRelations
                    taskId={editingTask.id}
                    workspaceId={currentWorkspace.id}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTask(null)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpdateTask}
                disabled={isCreating || !title}
              >
                {isCreating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog
          open={!!deletingTask}
          onOpenChange={(open) => !open && setDeletingTask(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the task &quot;
                {deletingTask?.title}&quot;. This action cannot be undone.
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
