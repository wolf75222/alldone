"use client";

import { useAuth } from "@/lib/hooks/use-auth";
import { useWorkspace } from "@/lib/context/workspace-context";
import { AuthGuard } from "@/components/auth-guard";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";
import { useWorkspaceMembers } from "@/lib/hooks/use-workspace-members";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import {
  ListTodo,
  CheckCircle2,
  Clock,
  AlertCircle,
  FolderKanban,
  Users,
  TrendingUp,
  Calendar,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";
import Link from "next/link";

const STATUS_COLORS = {
  todo: "#6b7280",
  in_progress: "#3b82f6",
  done: "#10b981",
  cancelled: "#ef4444",
};

const PRIORITY_COLORS = {
  low: "#6b7280",
  medium: "#f59e0b",
  high: "#ef4444",
  urgent: "#dc2626",
};

export default function Home() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { tasks, loading: tasksLoading } = useTasks(workspace?.id);
  const { projects, loading: projectsLoading } = useProjects(workspace?.id);
  const { members } = useWorkspaceMembers(workspace?.id);

  const userName =
    user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  // Calculate statistics
  const totalTasks = tasks.length;
  const todoTasks = tasks.filter((t) => t.status === "todo").length;
  const inProgressTasks = tasks.filter(
    (t) => t.status === "in_progress",
  ).length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;
  const totalProjects = projects.length;

  // Tasks by status for pie chart
  const tasksByStatus = [
    { name: "To Do", value: todoTasks, color: STATUS_COLORS.todo },
    {
      name: "In Progress",
      value: inProgressTasks,
      color: STATUS_COLORS.in_progress,
    },
    { name: "Done", value: doneTasks, color: STATUS_COLORS.done },
    {
      name: "Cancelled",
      value: tasks.filter((t) => t.status === "cancelled").length,
      color: STATUS_COLORS.cancelled,
    },
  ].filter((item) => item.value > 0);

  // Tasks by priority for bar chart
  const tasksByPriority = [
    { name: "Low", value: tasks.filter((t) => t.priority === "low").length },
    {
      name: "Medium",
      value: tasks.filter((t) => t.priority === "medium").length,
    },
    { name: "High", value: tasks.filter((t) => t.priority === "high").length },
    {
      name: "Urgent",
      value: tasks.filter((t) => t.priority === "urgent").length,
    },
  ];

  // Completion rate
  const completionRate =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Overdue tasks
  const now = new Date();
  const overdueTasks = tasks.filter(
    (t) => t.due_date && new Date(t.due_date) < now && t.status !== "done",
  ).length;

  // Due today/this week
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const dueTodayTasks = tasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date) >= today &&
      new Date(t.due_date) < tomorrow &&
      t.status !== "done",
  ).length;

  const dueThisWeekTasks = tasks.filter(
    (t) =>
      t.due_date &&
      new Date(t.due_date) >= today &&
      new Date(t.due_date) < nextWeek &&
      t.status !== "done",
  ).length;

  return (
    <AuthGuard>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome back, {userName}!
            </h1>
            <p className="text-muted-foreground mt-2">
              Here's what's happening with your projects today.
            </p>
          </div>
          <Link href="/tasks">
            <Button>
              <ListTodo className="mr-2 h-4 w-4" />
              View All Tasks
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {inProgressTasks} in progress
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{doneTasks}</div>
              <p className="text-xs text-muted-foreground">
                {completionRate}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Due This Week
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dueThisWeekTasks}</div>
              <p className="text-xs text-muted-foreground">
                {dueTodayTasks} due today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueTasks}</div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Tasks by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Tasks by Status</CardTitle>
              <CardDescription>
                Distribution of tasks across different statuses
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {tasksByStatus.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tasksByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tasksByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No tasks yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tasks by Priority */}
          <Card>
            <CardHeader>
              <CardTitle>Tasks by Priority</CardTitle>
              <CardDescription>
                Priority distribution of all tasks
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {totalTasks > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tasksByPriority}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No tasks yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Projects
              </CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProjects}</div>
              <Link href="/projects">
                <Button variant="link" className="px-0 h-auto">
                  View all projects →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Team Members
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <Link href="/settings/members">
                <Button variant="link" className="px-0 h-auto">
                  Manage members →
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Completion Rate
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completionRate}%</div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthGuard>
  );
}
