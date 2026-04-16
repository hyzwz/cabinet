"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Plus,
  Trash2,
  Pencil,
  Shield,
  ShieldCheck,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocale } from "@/components/i18n/locale-provider";
import { useAuthStore } from "@/stores/auth-store";
import type { SafeUser, UserRole } from "@/types";

const ROLE_ICONS: Record<UserRole, React.ReactNode> = {
  admin: <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />,
  editor: <Pencil className="h-3.5 w-3.5 text-blue-500" />,
  viewer: <Eye className="h-3.5 w-3.5 text-muted-foreground" />,
};

export function UsersTab() {
  const { t } = useLocale();
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    displayName: "",
    role: "editor" as UserRole,
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Edit user dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<SafeUser | null>(null);
  const [editForm, setEditForm] = useState({
    displayName: "",
    password: "",
    role: "editor" as UserRole,
  });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SafeUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/auth/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(data.users || []);
      setError("");
    } catch {
      setError(t("settings.users.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async () => {
    if (!createForm.username.trim() || !createForm.password) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: createForm.username.trim(),
          password: createForm.password,
          displayName: createForm.displayName.trim() || createForm.username.trim(),
          role: createForm.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create user");
        return;
      }
      setCreateOpen(false);
      setCreateForm({ username: "", password: "", displayName: "", role: "editor" });
      fetchUsers();
    } catch {
      setCreateError("Network error");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async () => {
    if (!editUser) return;
    setEditing(true);
    setEditError("");
    try {
      const body: Record<string, string> = { userId: editUser.id };
      if (editForm.displayName.trim()) body.displayName = editForm.displayName.trim();
      if (editForm.password) body.password = editForm.password;
      if (editForm.role !== editUser.role) body.role = editForm.role;

      const res = await fetch("/api/auth/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to update user");
        return;
      }
      setEditOpen(false);
      setEditUser(null);
      fetchUsers();
      // If editing self, refresh auth state
      if (editUser.id === currentUser?.userId) {
        useAuthStore.getState().fetchAuth();
      }
    } catch {
      setEditError("Network error");
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/auth/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: deleteTarget.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to delete user");
      }
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchUsers();
    } catch {
      setError("Network error");
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (user: SafeUser) => {
    setEditUser(user);
    setEditForm({
      displayName: user.displayName,
      password: "",
      role: user.role,
    });
    setEditError("");
    setEditOpen(true);
  };

  const openDelete = (user: SafeUser) => {
    setDeleteTarget(user);
    setDeleteOpen(true);
  };

  const roleLabel = (role: UserRole) => t(`settings.users.role.${role}`);

  const getInitials = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        {t("settings.users.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-semibold">{t("settings.users.title")}</h3>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            {t("settings.users.description")}
          </p>
        </div>
        <Button
          size="sm"
          className="h-7 text-[12px] gap-1.5"
          onClick={() => {
            setCreateForm({ username: "", password: "", displayName: "", role: "editor" });
            setCreateError("");
            setCreateOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          {t("settings.users.addUser")}
        </Button>
      </div>

      {error && (
        <div className="text-[12px] text-destructive bg-destructive/10 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {/* User list */}
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2 bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground/70 font-medium border-b border-border">
          <span>{t("settings.users.colUser")}</span>
          <span>{t("settings.users.colRole")}</span>
          <span>{t("settings.users.colCreated")}</span>
          <span className="text-right">{t("settings.users.colActions")}</span>
        </div>

        {users.length === 0 ? (
          <div className="px-4 py-8 text-center text-[12px] text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            {t("settings.users.noUsers")}
          </div>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="grid grid-cols-[1fr_1fr_auto_auto] gap-4 px-4 py-2.5 items-center border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors"
            >
              {/* User info */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-semibold shrink-0">
                  {getInitials(user.displayName || user.username)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">
                    {user.displayName || user.username}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    @{user.username}
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-1.5 text-[12px]">
                {ROLE_ICONS[user.role]}
                <span>{roleLabel(user.role)}</span>
              </div>

              {/* Created */}
              <div className="text-[11px] text-muted-foreground whitespace-nowrap">
                {new Date(user.createdAt).toLocaleDateString()}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => openEdit(user)}
                  title={t("settings.users.edit")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {user.id !== currentUser?.userId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => openDelete(user)}
                    title={t("settings.users.delete")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Plus className="h-4 w-4" />
              {t("settings.users.createTitle")}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {t("settings.users.createDescription")}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-[12px] font-medium mb-1 block">
                {t("settings.users.username")} *
              </label>
              <Input
                value={createForm.username}
                onChange={(e) => setCreateForm((f) => ({ ...f, username: e.target.value }))}
                placeholder={t("settings.users.usernamePlaceholder")}
                autoFocus
                className="h-8 text-[13px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium mb-1 block">
                {t("settings.users.displayName")}
              </label>
              <Input
                value={createForm.displayName}
                onChange={(e) => setCreateForm((f) => ({ ...f, displayName: e.target.value }))}
                placeholder={t("settings.users.displayNamePlaceholder")}
                className="h-8 text-[13px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium mb-1 block">
                {t("settings.users.password")} *
              </label>
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={t("settings.users.passwordPlaceholder")}
                className="h-8 text-[13px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium mb-1 block">
                {t("settings.users.role")}
              </label>
              <Select
                value={createForm.role}
                onValueChange={(val) => setCreateForm((f) => ({ ...f, role: val as UserRole }))}
              >
                <SelectTrigger size="sm" className="w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <Shield className="h-3.5 w-3.5 text-amber-500" />
                    {roleLabel("admin")}
                  </SelectItem>
                  <SelectItem value="editor">
                    <Pencil className="h-3.5 w-3.5 text-blue-500" />
                    {roleLabel("editor")}
                  </SelectItem>
                  <SelectItem value="viewer">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    {roleLabel("viewer")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <div className="text-[12px] text-destructive">{createError}</div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setCreateOpen(false)}
                className="h-8 text-[12px]"
              >
                {t("settings.users.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!createForm.username.trim() || !createForm.password || creating}
                className="h-8 text-[12px] gap-1.5"
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("settings.users.create")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Pencil className="h-4 w-4" />
              {t("settings.users.editTitle")}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {editUser && (
                <span>@{editUser.username}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleEdit();
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-[12px] font-medium mb-1 block">
                {t("settings.users.displayName")}
              </label>
              <Input
                value={editForm.displayName}
                onChange={(e) => setEditForm((f) => ({ ...f, displayName: e.target.value }))}
                className="h-8 text-[13px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium mb-1 block">
                {t("settings.users.newPassword")}
              </label>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={t("settings.users.newPasswordPlaceholder")}
                className="h-8 text-[13px]"
              />
            </div>
            <div>
              <label className="text-[12px] font-medium mb-1 block">
                {t("settings.users.role")}
              </label>
              <Select
                value={editForm.role}
                onValueChange={(val) => setEditForm((f) => ({ ...f, role: val as UserRole }))}
              >
                <SelectTrigger size="sm" className="w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <Shield className="h-3.5 w-3.5 text-amber-500" />
                    {roleLabel("admin")}
                  </SelectItem>
                  <SelectItem value="editor">
                    <Pencil className="h-3.5 w-3.5 text-blue-500" />
                    {roleLabel("editor")}
                  </SelectItem>
                  <SelectItem value="viewer">
                    <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                    {roleLabel("viewer")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editError && (
              <div className="text-[12px] text-destructive">{editError}</div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setEditOpen(false)}
                className="h-8 text-[12px]"
              >
                {t("settings.users.cancel")}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={editing}
                className="h-8 text-[12px] gap-1.5"
              >
                {editing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("settings.users.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px] text-destructive">
              <Trash2 className="h-4 w-4" />
              {t("settings.users.deleteTitle")}
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              {deleteTarget && t("settings.users.deleteConfirm").replace("{name}", deleteTarget.displayName || deleteTarget.username)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(false)}
              className="h-8 text-[12px]"
            >
              {t("settings.users.cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="h-8 text-[12px] gap-1.5"
            >
              {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("settings.users.confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
