"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronRight,
  ChevronDown,
  MoreVertical,
  Edit,
  Trash2,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  assignee_id: string | null;
  due_date: string | null;
  workspace_id: string;
  project_id: string | null;
  parent_task_id: string | null;
  team_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Member = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
};

type Team = {
  id: string;
  name: string;
  color: string;
};

interface TaskTreeItemProps {
  task: Task;
  childTasks: Task[];
  level: number;
  members: Member[];
  onEditClick: (task: Task) => void;
  onDeleteClick: (task: Task) => void;
  onCreateSubTask: (parentId: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  getChildren: (parentId: string) => Task[];
  priorityColors: Record<string, string>;
  statusColors: Record<string, string>;
  teams?: Team[];
}

export function TaskTreeItem({
  task,
  childTasks,
  level,
  members,
  onEditClick,
  onDeleteClick,
  onCreateSubTask,
  onToggleStatus,
  getChildren,
  priorityColors,
  statusColors,
  teams = [],
}: TaskTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = childTasks.length > 0;

  const assignee = members.find((m) => m.user_id === task.assignee_id);
  const team = teams.find((t) => t.id === task.team_id);

  return (
    <div className="w-full">
      <div
        className="mb-2 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
        style={{ marginLeft: `${level * 24}px` }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            )}
            {!hasChildren && <div className="w-6 shrink-0" />}

            <Checkbox
              checked={task.status === "done"}
              onCheckedChange={() => onToggleStatus(task.id, task.status)}
              className="shrink-0"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-medium text-sm truncate ${
                    task.status === "done"
                      ? "line-through text-muted-foreground"
                      : ""
                  }`}
                >
                  {task.title}
                </span>
                <Badge
                  variant="outline"
                  className={`${statusColors[task.status as keyof typeof statusColors] || ""} shrink-0`}
                >
                  {task.status.replace("_", " ")}
                </Badge>
                {task.priority && (
                  <Badge
                    variant="outline"
                    className={`${priorityColors[task.priority]} shrink-0`}
                  >
                    {task.priority}
                  </Badge>
                )}
                {team && (
                  <Badge variant="secondary" className="text-xs shrink-0">
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: team.color }}
                      />
                      {team.name}
                    </div>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                {assignee && (
                  <span>{assignee.full_name || assignee.email}</span>
                )}
                {task.due_date && (
                  <div className="flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" />
                    <span>{new Date(task.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                {hasChildren && (
                  <span className="text-muted-foreground">
                    {childTasks.length} subtask
                    {childTasks.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateSubTask(task.id)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Sub-task
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEditClick(task)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDeleteClick(task)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded &&
        childTasks.map((child) => (
          <TaskTreeItem
            key={child.id}
            task={child}
            childTasks={getChildren(child.id)}
            level={level + 1}
            members={members}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            onCreateSubTask={onCreateSubTask}
            onToggleStatus={onToggleStatus}
            getChildren={getChildren}
            priorityColors={priorityColors}
            statusColors={statusColors}
            teams={teams}
          />
        ))}
    </div>
  );
}
