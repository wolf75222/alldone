"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  FolderPlus,
  Calendar,
} from "lucide-react";

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

type Team = {
  id: string;
  name: string;
  color: string;
};

interface ProjectTreeItemProps {
  project: Project;
  childProjects: Project[];
  level: number;
  onEditClick: (project: Project) => void;
  onDeleteClick: (project: Project) => void;
  onCreateSubProject: (parentId: string) => void;
  getChildren: (parentId: string) => Project[];
  teams?: Team[];
}

export function ProjectTreeItem({
  project,
  childProjects,
  level,
  onEditClick,
  onDeleteClick,
  onCreateSubProject,
  getChildren,
  teams = [],
}: ProjectTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = childProjects.length > 0;

  const team = teams.find((t) => t.id === project.team_id);

  return (
    <div className="w-full">
      <Card className="mb-2" style={{ marginLeft: `${level * 24}px` }}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              )}
              {!hasChildren && <div className="w-6" />}

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{project.name}</h3>
                  <Badge variant="outline">{project.status}</Badge>
                  {team && (
                    <Badge variant="secondary" className="text-xs">
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
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {project.description}
                  </p>
                )}
                {(project.start_date || project.end_date) && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      {project.start_date &&
                        new Date(project.start_date).toLocaleDateString()}
                      {project.start_date && project.end_date && " - "}
                      {project.end_date &&
                        new Date(project.end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
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
                  onClick={() => onCreateSubProject(project.id)}
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Add Sub-project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditClick(project)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDeleteClick(project)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {isExpanded &&
        childProjects.map((child) => (
          <ProjectTreeItem
            key={child.id}
            project={child}
            childProjects={getChildren(child.id)}
            level={level + 1}
            onEditClick={onEditClick}
            onDeleteClick={onDeleteClick}
            onCreateSubProject={onCreateSubProject}
            getChildren={getChildren}
            teams={teams}
          />
        ))}
    </div>
  );
}
