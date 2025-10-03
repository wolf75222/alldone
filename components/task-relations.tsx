"use client";

import { useState } from "react";
import { useTaskRelations } from "@/lib/hooks/use-task-relations";
import { useTasks } from "@/lib/hooks/use-tasks";
import type { TaskRelationType } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Label } from "@/components/ui/label";
import {
  Link2,
  GitMerge,
  GitPullRequest,
  Copy,
  X,
  Plus,
  Loader2,
} from "lucide-react";

interface TaskRelationsProps {
  taskId: string;
  workspaceId: string;
}

const RELATION_TYPES: {
  value: TaskRelationType;
  label: string;
  icon: typeof Link2;
  description: string;
  color: string;
}[] = [
  {
    value: "blocks",
    label: "Blocks",
    icon: GitPullRequest,
    description: "This task blocks another task",
    color: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
  {
    value: "depends",
    label: "Depends on",
    icon: GitMerge,
    description: "This task depends on another task",
    color: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  },
  {
    value: "duplicates",
    label: "Duplicates",
    icon: Copy,
    description: "This task is a duplicate",
    color: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  {
    value: "relates",
    label: "Relates to",
    icon: Link2,
    description: "This task relates to another task",
    color: "bg-gray-500/10 text-gray-700 dark:text-gray-300",
  },
];

export function TaskRelations({ taskId, workspaceId }: TaskRelationsProps) {
  const { relations, loading, addRelation, removeRelation } =
    useTaskRelations(taskId);
  const { tasks } = useTasks(workspaceId);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedType, setSelectedType] = useState<TaskRelationType>("blocks");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out the current task and already related tasks
  const availableTasks = tasks.filter((t) => {
    if (t.id === taskId) return false;
    const isRelated = relations.some(
      (r) =>
        (r.source_task_id === taskId && r.target_task_id === t.id) ||
        (r.target_task_id === taskId && r.source_task_id === t.id),
    );
    return !isRelated;
  });

  const handleAddRelation = async () => {
    if (!selectedTaskId) return;

    setIsSubmitting(true);
    setAddError(null);

    const result = await addRelation(selectedTaskId, selectedType);

    if (result.success) {
      setIsAdding(false);
      setSelectedTaskId("");
      setSelectedType("blocks");
    } else {
      setAddError(result.error || "Failed to add relation");
    }

    setIsSubmitting(false);
  };

  const handleRemoveRelation = async (relationId: string) => {
    await removeRelation(relationId);
  };

  const getRelationLabel = (
    relation: (typeof relations)[number],
    type: TaskRelationType,
  ) => {
    const typeConfig = RELATION_TYPES.find((t) => t.value === type);
    if (!typeConfig) return type;

    // Determine direction and adjust label
    const isOutgoing = relation.source_task_id === taskId;

    if (type === "blocks") {
      return isOutgoing ? "Blocks" : "Blocked by";
    } else if (type === "depends") {
      return isOutgoing ? "Depends on" : "Depended on by";
    } else {
      return typeConfig.label;
    }
  };

  const getRelatedTask = (relation: (typeof relations)[number]) => {
    const isOutgoing = relation.source_task_id === taskId;
    return isOutgoing ? relation.target_task : relation.source_task;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Task Relations</Label>
        {!isAdding && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAdding(true)}
            className="h-7 text-xs"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Relation
          </Button>
        )}
      </div>

      {/* Add Relation Form */}
      {isAdding && (
        <div className="border rounded-lg p-4 space-y-3 bg-muted/50">
          <div className="space-y-2">
            <Label className="text-xs">Relation Type</Label>
            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as TaskRelationType)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RELATION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3" />
                        <span>{type.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {
                RELATION_TYPES.find((t) => t.value === selectedType)
                  ?.description
              }
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Target Task</Label>
            <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start h-8 text-xs"
                >
                  {selectedTaskId ? (
                    tasks.find((t) => t.id === selectedTaskId)?.title
                  ) : (
                    <span className="text-muted-foreground">
                      Select a task...
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[300px]" align="start">
                <Command>
                  <CommandInput placeholder="Search tasks..." className="h-8" />
                  <CommandList>
                    <CommandEmpty>No tasks found.</CommandEmpty>
                    <CommandGroup>
                      {availableTasks.map((task) => (
                        <CommandItem
                          key={task.id}
                          onSelect={() => {
                            setSelectedTaskId(task.id);
                            setTaskPopoverOpen(false);
                          }}
                          className="text-xs"
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{task.title}</span>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4"
                              >
                                {task.status}
                              </Badge>
                              {task.priority && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4"
                                >
                                  {task.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {addError && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-3 py-2 rounded-md text-xs">
              {addError}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsAdding(false);
                setSelectedTaskId("");
                setAddError(null);
              }}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddRelation}
              disabled={!selectedTaskId || isSubmitting}
              className="h-7 text-xs"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="mr-1 h-3 w-3" />
                  Add
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Relations List */}
      {relations.length === 0 && !isAdding && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No relations yet. Add one to link this task with others.
        </p>
      )}

      {relations.length > 0 && (
        <div className="space-y-2">
          {relations.map((relation) => {
            const typeConfig = RELATION_TYPES.find(
              (t) => t.value === relation.relation_type,
            );
            const Icon = typeConfig?.icon || Link2;
            const relatedTask = getRelatedTask(relation);

            if (!relatedTask) return null;

            return (
              <div
                key={relation.id}
                className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-4 ${typeConfig?.color}`}
                      >
                        {getRelationLabel(relation, relation.relation_type)}
                      </Badge>
                      <span className="text-xs font-medium truncate">
                        {relatedTask.title}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] h-4 w-fit">
                      {relatedTask.status}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => handleRemoveRelation(relation.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
