// Database types for Supabase
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: "owner" | "admin" | "maintainer" | "member" | "viewer";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: "owner" | "admin" | "maintainer" | "member" | "viewer";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: "owner" | "admin" | "maintainer" | "member" | "viewer";
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          description: string | null;
          color: string;
          created_at: string;
          updated_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          description?: string | null;
          color?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string | null;
        };
      };
      team_members: {
        Row: {
          id: string;
          team_id: string;
          user_id: string;
          role: "lead" | "member";
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          user_id: string;
          role?: "lead" | "member";
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          user_id?: string;
          role?: "lead" | "member";
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          workspace_id: string;
          team_id: string | null;
          parent_id: string | null;
          name: string;
          description: string | null;
          status: string;
          start_date: string | null;
          end_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          team_id?: string | null;
          parent_id?: string | null;
          name: string;
          description?: string | null;
          status?: string;
          start_date?: string | null;
          end_date?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          team_id?: string | null;
          parent_id?: string | null;
          name?: string;
          description?: string | null;
          status?: string;
          start_date?: string | null;
          end_date?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          project_id: string | null;
          team_id: string | null;
          parent_id: string | null;
          title: string;
          description: string | null;
          status: string;
          priority: "low" | "medium" | "high" | "urgent" | null;
          assignee_id: string | null;
          start_date: string | null;
          due_date: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          project_id?: string | null;
          team_id?: string | null;
          parent_id?: string | null;
          title: string;
          description?: string | null;
          status?: string;
          priority?: "low" | "medium" | "high" | "urgent" | null;
          assignee_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          team_id?: string | null;
          project_id?: string | null;
          parent_id?: string | null;
          title?: string;
          description?: string | null;
          status?: string;
          priority?: "low" | "medium" | "high" | "urgent" | null;
          assignee_id?: string | null;
          start_date?: string | null;
          due_date?: string | null;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      labels: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          color: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          color: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          color?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      task_labels: {
        Row: {
          task_id: string;
          label_id: string;
          created_at: string;
        };
        Insert: {
          task_id: string;
          label_id: string;
          created_at?: string;
        };
        Update: {
          task_id?: string;
          label_id?: string;
          created_at?: string;
        };
      };
      task_relations: {
        Row: {
          id: string;
          source_task_id: string;
          target_task_id: string;
          relation_type: "blocks" | "depends" | "duplicates" | "relates";
          created_at: string;
          created_by: string | null;
        };
        Insert: {
          id?: string;
          source_task_id: string;
          target_task_id: string;
          relation_type: "blocks" | "depends" | "duplicates" | "relates";
          created_at?: string;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          source_task_id?: string;
          target_task_id?: string;
          relation_type?: "blocks" | "depends" | "duplicates" | "relates";
          created_at?: string;
          created_by?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for task relations
export type TaskRelationType = "blocks" | "depends" | "duplicates" | "relates";

export interface TaskRelation {
  id: string;
  source_task_id: string;
  target_task_id: string;
  relation_type: TaskRelationType;
  created_at: string;
  created_by: string | null;
}

export interface TaskRelationWithTask extends TaskRelation {
  source_task?: {
    id: string;
    title: string;
    status: string;
  };
  target_task?: {
    id: string;
    title: string;
    status: string;
  };
}

// Milestone types
export type MilestoneStatus = "upcoming" | "completed" | "missed";

export interface Milestone {
  id: string;
  workspace_id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  due_date: string;
  status: MilestoneStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
