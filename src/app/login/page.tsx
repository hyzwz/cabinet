"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { HeaderActions } from "@/components/layout/header-actions";
import { useLocale } from "@/components/i18n/locale-provider";

type AuthMode = "loading" | "legacy" | "multi" | "setup";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [requestAccess, setRequestAccess] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("multi");
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    fetch("/api/auth/check")
      .then((r) => r.json())
      .then((data) => {
        if (data.authenticated) {
          router.push("/");
          return;
        }
        if (data.mode === "multi") {
          setAuthMode("multi");
        } else if (data.mode === "legacy") {
          setAuthMode("legacy");
        } else if (data.needsSetup) {
          setAuthMode("setup");
        } else {
          setAuthMode("legacy");
        }
      })
      .catch(() => setAuthMode("legacy"));
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPendingMessage("");
    setLoading(true);

    try {
      if (authMode === "legacy") {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });
        if (res.ok) {
          router.push("/");
          router.refresh();
        } else {
          setError(t("login.wrongPassword"));
        }
      } else if (authMode === "multi") {
        if (requestAccess) {
          const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username,
              password,
              displayName: displayName || username,
              joinCode,
            }),
          });
          const data = await res.json().catch(() => null);
          if (res.ok) {
            setPendingMessage("申请已提交，等待公司管理员审批。");
            setPassword("");
          } else {
            setError(data?.error || t("login.connectionError"));
          }
        } else {
          const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password }),
          });
          if (res.ok) {
            router.push("/");
            router.refresh();
          } else {
            const data = await res.json().catch(() => null);
            setError(data?.error || t("login.invalidCredentials"));
          }
        }
      }
    } catch {
      setError(t("login.connectionError"));
    }
    setLoading(false);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName: displayName || username }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error || t("login.connectionError"));
      }
    } catch {
      setError(t("login.connectionError"));
    }
    setLoading(false);
  };

  if (authMode === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-sm">...</div>
      </div>
    );
  }

  const isSetup = authMode === "setup";
  const isMulti = authMode === "multi";
  const showUsername = isSetup || isMulti;
  const showDisplayName = isSetup || (isMulti && requestAccess);

  return (
    <div className="min-h-screen bg-background">
      <div className="flex justify-end px-4 py-3">
        <HeaderActions />
      </div>
      <div className="flex min-h-[calc(100vh-56px)] items-center justify-center">
      <div className="w-full max-w-sm mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-[-0.03em]">GreatClaw</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isSetup
              ? t("login.setupHelper")
              : isMulti
                ? t("login.helperMulti")
                : t("login.helper")}
          </p>
        </div>
        <form onSubmit={isSetup ? handleSetup : handleLogin} className="space-y-4">
          {showUsername && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t("login.usernamePlaceholder")}
              autoFocus
              autoComplete="username"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}
          {showDisplayName && (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("login.displayNamePlaceholder")}
              autoComplete="name"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}
          {isMulti && requestAccess && (
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="公司邀请码"
              autoComplete="off"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("login.passwordPlaceholder")}
            autoFocus={!showUsername}
            autoComplete={isSetup ? "new-password" : "current-password"}
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          {error && (
            <p className="text-[12px] text-red-400">{error}</p>
          )}
          {pendingMessage && (
            <p className="text-[12px] text-emerald-500">{pendingMessage}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password || (showUsername && !username) || (isMulti && requestAccess && !joinCode)}
            className="w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading
              ? t("login.loading")
              : isSetup
                ? t("login.createAccount")
                : requestAccess
                  ? "申请加入"
                  : t("login.signIn")}
          </button>
          {isMulti && (
            <button
              type="button"
              className="w-full text-[12px] text-muted-foreground hover:text-foreground"
              onClick={() => {
                setError("");
                setPendingMessage("");
                setRequestAccess((value) => !value);
              }}
            >
              {requestAccess ? "已有账号，返回登录" : "没有账号？申请加入公司"}
            </button>
          )}
        </form>
      </div>
      </div>
    </div>
  );
}
