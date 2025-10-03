"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/use-auth";
import { useWorkspace } from "@/lib/context/workspace-context";
import { useWorkspaceMembers } from "@/lib/hooks/use-workspace-members";
import { AuthGuard } from "@/components/auth-guard";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, MoreVertical, Trash2, UserCog, Mail } from "lucide-react";

const ROLES = ["owner", "admin", "maintainer", "member", "viewer"] as const;

const ROLE_DESCRIPTIONS = {
  owner: "Full access and workspace ownership",
  admin: "Manage members and workspace settings",
  maintainer: "Create and manage projects",
  member: "Create and manage tasks",
  viewer: "View only access",
};

const ROLE_COLORS = {
  owner:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  maintainer: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  member: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  viewer: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

export default function MembersPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { workspace, loading: workspaceLoading } = useWorkspace();
  const { members, loading } = useWorkspaceMembers(workspace?.id);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<(typeof ROLES)[number]>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [changingRoleMemberId, setChangingRoleMemberId] = useState<
    string | null
  >(null);
  const [newRole, setNewRole] = useState<(typeof ROLES)[number]>("member");

  const currentMember = members.find((m) => m.user_id === user?.id);
  const canManageMembers =
    currentMember?.role === "owner" || currentMember?.role === "admin";

  async function handleInviteMember() {
    if (!inviteEmail || !workspace) return;

    setIsInviting(true);
    setError(null);

    try {
      const supabase = createClient();

      // Check if user exists
      const { data: existingUser, error: userError } = await supabase
        .from("users")
        .select("id")
        .eq("email", inviteEmail)
        .single();

      if (userError && userError.code !== "PGRST116") {
        throw userError;
      }

      if (!existingUser) {
        setError("User with this email does not exist in the system");
        return;
      }

      // Check if already a member
      const { data: existingMember } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspace.id)
        .eq("user_id", existingUser.id)
        .single();

      if (existingMember) {
        setError("User is already a member of this workspace");
        return;
      }

      // Add member
      const { error: insertError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspace.id,
          user_id: existingUser.id,
          role: inviteRole,
        });

      if (insertError) throw insertError;

      setInviteEmail("");
      setInviteRole("member");
      setIsInviteDialogOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setIsInviting(false);
    }
  }

  async function handleRemoveMember() {
    if (!removingMemberId || !workspace) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("workspace_members")
        .delete()
        .eq("workspace_id", workspace.id)
        .eq("user_id", removingMemberId);

      if (error) throw error;
      setRemovingMemberId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  async function handleChangeRole() {
    if (!changingRoleMemberId || !workspace) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("workspace_id", workspace.id)
        .eq("user_id", changingRoleMemberId);

      if (error) throw error;
      setChangingRoleMemberId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change role");
    }
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
            <h1 className="text-3xl font-bold">Members</h1>
            <p className="text-muted-foreground">
              Manage workspace members and their permissions
            </p>
          </div>
          {canManageMembers && (
            <Dialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite a new member</DialogTitle>
                  <DialogDescription>
                    Add a new member to your workspace.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  {error && (
                    <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-md text-sm">
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email *</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="member@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      disabled={isInviting}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) =>
                        setInviteRole(v as typeof inviteRole)
                      }
                    >
                      <SelectTrigger id="invite-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.filter((r) => r !== "owner").map((role) => (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center gap-2">
                              <span className="capitalize">{role}</span>
                              <span className="text-xs text-muted-foreground">
                                - {ROLE_DESCRIPTIONS[role]}
                              </span>
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
                    onClick={() => setIsInviteDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleInviteMember} disabled={isInviting}>
                    {isInviting ? "Inviting..." : "Invite Member"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Members Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {(member.user.full_name || member.user.email)
                              ?.charAt(0)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {member.user.full_name || "No name"}
                          </p>
                          {member.user_id === user?.id && (
                            <p className="text-xs text-muted-foreground">You</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {member.user.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_COLORS[member.role]}>
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canManageMembers &&
                        member.user_id !== user?.id &&
                        member.role !== "owner" && (
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
                                onClick={() => {
                                  setChangingRoleMemberId(member.user_id);
                                  setNewRole(member.role);
                                }}
                              >
                                <UserCog className="mr-2 h-4 w-4" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() =>
                                  setRemovingMemberId(member.user_id)
                                }
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Remove Member Dialog */}
        <AlertDialog
          open={!!removingMemberId}
          onOpenChange={(open) => !open && setRemovingMemberId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove member</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this member from the workspace?
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRemoveMember}>
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Change Role Dialog */}
        <Dialog
          open={!!changingRoleMemberId}
          onOpenChange={(open) => !open && setChangingRoleMemberId(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change member role</DialogTitle>
              <DialogDescription>
                Update the role and permissions for this member.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="new-role">Role</Label>
              <Select
                value={newRole}
                onValueChange={(v) => setNewRole(v as typeof newRole)}
              >
                <SelectTrigger id="new-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.filter((r) => r !== "owner").map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex flex-col gap-1">
                        <span className="capitalize font-medium">{role}</span>
                        <span className="text-xs text-muted-foreground">
                          {ROLE_DESCRIPTIONS[role]}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setChangingRoleMemberId(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleChangeRole}>Update Role</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
