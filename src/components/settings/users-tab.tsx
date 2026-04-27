"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Building2,
  Check,
  Copy,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/auth-store";
import type { CompanyMemberView, CompanyMembershipStatus, CompanyRole, CompanySummary } from "@/types";

type CompaniesResponse = {
  companies: CompanySummary[];
  membersByCompanyId: Record<string, CompanyMemberView[]>;
};

const STATUS_LABELS: Record<CompanyMembershipStatus, string> = {
  pending: "待审批",
  active: "已启用",
  rejected: "已拒绝",
  disabled: "已禁用",
};

const ROLE_LABELS: Record<CompanyRole, string> = {
  company_admin: "公司管理员",
  company_member: "成员",
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UsersTab() {
  const currentUser = useAuthStore((state) => state.user);
  const isPlatformAdmin = currentUser?.systemRole === "platform_admin" || currentUser?.role === "admin";
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [membersByCompanyId, setMembersByCompanyId] = useState<Record<string, CompanyMemberView[]>>({});
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    adminUsername: "",
    adminPassword: "",
    adminDisplayName: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId) || companies[0] || null,
    [companies, selectedCompanyId],
  );
  const selectedMembers = selectedCompany ? membersByCompanyId[selectedCompany.id] || [] : [];
  const pendingMembers = selectedMembers.filter((member) => member.membershipStatus === "pending");
  const activeMembers = selectedMembers.filter((member) => member.membershipStatus !== "pending");

  const loadCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/companies");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "无法加载组织信息");
        return;
      }
      const payload = data as CompaniesResponse;
      setCompanies(payload.companies || []);
      setMembersByCompanyId(payload.membersByCompanyId || {});
      setSelectedCompanyId((current) => current || payload.companies?.[0]?.id || "");
      setError("");
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCompanies();
  }, [loadCompanies]);

  const createCompany = async () => {
    if (!createForm.name.trim()) return;
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name.trim(),
          adminUsername: createForm.adminUsername.trim() || undefined,
          adminPassword: createForm.adminPassword || undefined,
          adminDisplayName: createForm.adminDisplayName.trim() || createForm.adminUsername.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "创建公司失败");
        return;
      }
      setCreateOpen(false);
      setCreateForm({ name: "", adminUsername: "", adminPassword: "", adminDisplayName: "" });
      await loadCompanies();
      if (data.company?.id) setSelectedCompanyId(data.company.id);
    } catch {
      setCreateError("网络错误");
    } finally {
      setCreating(false);
    }
  };

  const refreshJoinCode = async () => {
    if (!selectedCompany) return;
    const res = await fetch(`/api/admin/companies/${selectedCompany.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshJoinCode: true }),
    });
    if (res.ok) await loadCompanies();
  };

  const updateMember = async (
    member: CompanyMemberView,
    updates: { companyRole?: CompanyRole; membershipStatus?: CompanyMembershipStatus },
  ) => {
    if (!selectedCompany) return;
    const res = await fetch(`/api/admin/companies/${selectedCompany.id}/members/${member.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "更新成员失败");
      return;
    }
    await loadCompanies();
  };

  const copyJoinCode = async () => {
    if (!selectedCompany) return;
    await navigator.clipboard.writeText(selectedCompany.joinCode);
    setCopiedCode(selectedCompany.joinCode);
    setTimeout(() => setCopiedCode(""), 1500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        加载组织信息...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[13px] font-semibold">企业组织管理</h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            管理公司、公司管理员、注册审批和成员状态。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[12px]" onClick={() => void loadCompanies()}>
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </Button>
          {isPlatformAdmin && (
            <Button
              size="sm"
              className="h-7 gap-1.5 text-[12px]"
              onClick={() => {
                setCreateError("");
                setCreateOpen(true);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              新建公司
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
          {error}
        </div>
      )}

      {companies.length === 0 ? (
        <div className="rounded-lg border border-border px-4 py-8 text-center text-[12px] text-muted-foreground">
          <Building2 className="mx-auto mb-2 h-8 w-8 opacity-35" />
          暂无可管理公司
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-lg border border-border">
            <div className="border-b border-border px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              公司
            </div>
            <div className="p-1.5">
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => setSelectedCompanyId(company.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[12px] transition-colors ${
                    selectedCompany?.id === company.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate font-medium">{company.name}</span>
                  {company.pendingCount > 0 && (
                    <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-600">
                      {company.pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {selectedCompany && (
            <div className="space-y-4">
              <div className="rounded-lg border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-[14px] font-semibold">{selectedCompany.name}</h4>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {selectedCompany.status === "active" ? "启用中" : "已停用"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{selectedCompany.memberCount} 位成员</span>
                      <span>{selectedCompany.adminCount} 位公司管理员</span>
                      <span>{selectedCompany.pendingCount} 个待审批</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[12px]">
                      {selectedCompany.joinCode}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void copyJoinCode()} title="复制加入码">
                      {copiedCode === selectedCompany.joinCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                    {isPlatformAdmin && (
                      <Button variant="ghost" size="sm" className="h-7 text-[12px]" onClick={() => void refreshJoinCode()}>
                        重置加入码
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {pendingMembers.length > 0 && (
                <div className="rounded-lg border border-border">
                  <div className="border-b border-border px-3 py-2 text-[12px] font-medium">
                    待审批注册
                  </div>
                  <div>
                    {pendingMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-semibold text-amber-600">
                          {getInitials(member.displayName || member.username)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium">{member.displayName || member.username}</div>
                          <div className="truncate text-[11px] text-muted-foreground">@{member.username}</div>
                        </div>
                        <Button size="sm" className="h-7 gap-1.5 text-[12px]" onClick={() => void updateMember(member, { membershipStatus: "active" })}>
                          <UserCheck className="h-3.5 w-3.5" />
                          通过
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-[12px] text-destructive" onClick={() => void updateMember(member, { membershipStatus: "rejected" })}>
                          <UserX className="h-3.5 w-3.5" />
                          拒绝
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-border">
                <div className="grid grid-cols-[1fr_150px_120px_160px] gap-3 border-b border-border bg-muted/40 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  <span>成员</span>
                  <span>公司角色</span>
                  <span>状态</span>
                  <span className="text-right">操作</span>
                </div>
                {activeMembers.length === 0 ? (
                  <div className="px-3 py-8 text-center text-[12px] text-muted-foreground">
                    <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
                    暂无成员
                  </div>
                ) : (
                  activeMembers.map((member) => (
                    <div key={member.id} className="grid grid-cols-[1fr_150px_120px_160px] items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                          {getInitials(member.displayName || member.username)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-[13px] font-medium">{member.displayName || member.username}</div>
                          <div className="truncate text-[11px] text-muted-foreground">@{member.username}</div>
                        </div>
                      </div>

                      <Select
                        value={member.companyRole}
                        onValueChange={(value) => void updateMember(member, { companyRole: value as CompanyRole })}
                        disabled={member.membershipStatus !== "active"}
                      >
                        <SelectTrigger size="sm" className="h-7 text-[12px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="company_admin">
                            <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                            {ROLE_LABELS.company_admin}
                          </SelectItem>
                          <SelectItem value="company_member">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            {ROLE_LABELS.company_member}
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      <span className="text-[12px] text-muted-foreground">
                        {STATUS_LABELS[member.membershipStatus]}
                      </span>

                      <div className="flex justify-end">
                        {member.membershipStatus === "active" ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[12px] text-destructive"
                            disabled={member.id === currentUser?.userId}
                            onClick={() => void updateMember(member, { membershipStatus: "disabled" })}
                          >
                            禁用
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[12px]"
                            onClick={() => void updateMember(member, { membershipStatus: "active" })}
                          >
                            启用
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[15px]">
              <Building2 className="h-4 w-4" />
              新建公司
            </DialogTitle>
            <DialogDescription className="text-[12px]">
              可同时创建该公司的第一个公司管理员。
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void createCompany();
            }}
          >
            <div>
              <label className="mb-1 block text-[12px] font-medium">公司名称 *</label>
              <Input
                value={createForm.name}
                onChange={(event) => setCreateForm((form) => ({ ...form, name: event.target.value }))}
                className="h-8 text-[13px]"
                autoFocus
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[12px] font-medium">管理员账号</label>
                <Input
                  value={createForm.adminUsername}
                  onChange={(event) => setCreateForm((form) => ({ ...form, adminUsername: event.target.value }))}
                  className="h-8 text-[13px]"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium">初始密码</label>
                <Input
                  type="password"
                  value={createForm.adminPassword}
                  onChange={(event) => setCreateForm((form) => ({ ...form, adminPassword: event.target.value }))}
                  className="h-8 text-[13px]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium">管理员显示名称</label>
              <Input
                value={createForm.adminDisplayName}
                onChange={(event) => setCreateForm((form) => ({ ...form, adminDisplayName: event.target.value }))}
                className="h-8 text-[13px]"
              />
            </div>
            {createError && <div className="text-[12px] text-destructive">{createError}</div>}
            <DialogFooter>
              <Button type="button" variant="ghost" size="sm" className="h-8 text-[12px]" onClick={() => setCreateOpen(false)}>
                取消
              </Button>
              <Button type="submit" size="sm" className="h-8 gap-1.5 text-[12px]" disabled={!createForm.name.trim() || creating}>
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                创建
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
