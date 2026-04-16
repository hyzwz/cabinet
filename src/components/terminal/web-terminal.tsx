"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type ConnectionState = "idle" | "connecting" | "connected" | "error" | "closed";

interface WebTerminalProps {
  sessionId?: string;
  prompt?: string;
  displayPrompt?: string;
  reconnect?: boolean; // If true, connect without sending prompt (session already exists on server)
  themeSurface?: "terminal" | "page";
  providerId?: string;
  onClose: () => void;
}

interface DaemonAuthPayload {
  token: string;
  wsOrigin?: string;
}

interface SessionOutputPayload {
  status?: string;
  output?: string;
  exitCode?: number | null;
}

const MAX_WS_RETRIES = 3;
const WS_RETRY_DELAY_MS = 2000;
const HTTP_POLL_INTERVAL_MS = 2000;
const STATUS_POLL_INTERVAL_MS = 3000;

function readRootVar(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

function getTerminalTheme(themeSurface: "terminal" | "page" = "terminal") {
  const backgroundVar = themeSurface === "page" ? "--background" : "--terminal-bg";
  const foregroundVar = themeSurface === "page" ? "--foreground" : "--terminal-fg";
  const background = readRootVar(backgroundVar, "#0a0a0a");
  const foreground = readRootVar(foregroundVar, "#e5e5e5");

  return {
    background,
    foreground,
    cursor: readRootVar("--terminal-cursor", foreground),
    cursorAccent: background,
    selectionBackground: readRootVar("--terminal-selection", "#ffffff30"),
    selectionForeground: foreground,
    black: readRootVar("--terminal-ansi-black", "#1a1a2e"),
    red: readRootVar("--terminal-ansi-red", "#ff6b6b"),
    green: readRootVar("--terminal-ansi-green", "#51cf66"),
    yellow: readRootVar("--terminal-ansi-yellow", "#ffd43b"),
    blue: readRootVar("--terminal-ansi-blue", "#74c0fc"),
    magenta: readRootVar("--terminal-ansi-magenta", "#cc5de8"),
    cyan: readRootVar("--terminal-ansi-cyan", "#66d9e8"),
    white: readRootVar("--terminal-ansi-white", foreground),
    brightBlack: readRootVar("--terminal-ansi-bright-black", "#555570"),
    brightRed: readRootVar("--terminal-ansi-bright-red", "#ff8787"),
    brightGreen: readRootVar("--terminal-ansi-bright-green", "#69db7c"),
    brightYellow: readRootVar("--terminal-ansi-bright-yellow", "#ffe066"),
    brightBlue: readRootVar("--terminal-ansi-bright-blue", "#91d5ff"),
    brightMagenta: readRootVar("--terminal-ansi-bright-magenta", "#da77f2"),
    brightCyan: readRootVar("--terminal-ansi-bright-cyan", "#99e9f2"),
    brightWhite: readRootVar("--terminal-ansi-bright-white", "#ffffff"),
  };
}

function replacePastedTextNotice(output: string, displayPrompt?: string): string {
  if (!displayPrompt) return output;
  return output.replace(/\[Pasted text #\d+(?: \+\d+ lines)?\]/g, displayPrompt);
}

export function WebTerminal({
  sessionId,
  prompt,
  displayPrompt,
  providerId,
  reconnect,
  themeSurface = "terminal",
  onClose,
}: WebTerminalProps) {
  const termRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const xtermRef = useRef<import("@xterm/xterm").Terminal | null>(null);
  const fitAddonRef = useRef<import("@xterm/addon-fit").FitAddon | null>(null);
  const onCloseRef = useRef(onClose);
  const [connState, setConnState] = useState<ConnectionState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const retryCountRef = useRef(0);
  const httpFallbackActiveRef = useRef(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Manual retry handler exposed to the UI
  const handleRetry = useCallback(() => {
    retryCountRef.current = 0;
    setConnState("idle");
    setErrorMsg(null);
    setRetryKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let terminal: import("@xterm/xterm").Terminal | null = null;
    let ws: WebSocket | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let themeObserver: MutationObserver | null = null;
    let statusPollHandle: ReturnType<typeof setInterval> | null = null;
    let httpPollHandle: ReturnType<typeof setInterval> | null = null;
    let disposed = false;
    let sessionFinished = false;
    let wsRetryTimer: ReturnType<typeof setTimeout> | null = null;
    let httpOutputOffset = 0;

    const finishSession = (closeSocket = false) => {
      if (disposed || sessionFinished) return;
      sessionFinished = true;
      if (statusPollHandle) { clearInterval(statusPollHandle); statusPollHandle = null; }
      if (httpPollHandle) { clearInterval(httpPollHandle); httpPollHandle = null; }
      terminal?.write("\r\n\x1b[90m[Session ended]\x1b[0m\r\n");
      if (closeSocket && ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      setConnState("closed");
      onCloseRef.current?.();
    };

    // HTTP polling fallback: fetch output via Next.js proxy when WebSocket fails
    function startHttpFallback(id: string) {
      if (httpFallbackActiveRef.current || disposed) return;
      httpFallbackActiveRef.current = true;
      httpOutputOffset = 0;

      terminal?.write("\x1b[33m[Streaming via HTTP fallback]\x1b[0m\r\n");
      setConnState("connected");

      httpPollHandle = setInterval(() => {
        if (disposed || sessionFinished) return;
        void (async () => {
          try {
            const resp = await fetch(`/api/daemon/session/${id}/output`);
            if (!resp.ok) return;
            const data = (await resp.json()) as SessionOutputPayload;
            if (data.output && terminal) {
              const newContent = data.output.substring(httpOutputOffset);
              if (newContent) {
                terminal.write(newContent);
                httpOutputOffset = data.output.length;
              }
            }
            if (data.status && data.status !== "running") {
              finishSession(false);
            }
          } catch {
            // Ignore transient polling failures
          }
        })();
      }, HTTP_POLL_INTERVAL_MS);
    }

    const init = async () => {
      const { Terminal } = await import("@xterm/xterm");
      const { FitAddon } = await import("@xterm/addon-fit");
      const { WebLinksAddon } = await import("@xterm/addon-web-links");
      const { Unicode11Addon } = await import("@xterm/addon-unicode11");

      await import("@xterm/xterm/css/xterm.css");

      if (disposed) return;

      terminal = new Terminal({
        cursorBlink: true,
        cursorStyle: "bar",
        fontSize: 13,
        fontFamily:
          "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, Monaco, 'Courier New', monospace",
        lineHeight: 1.2,
        letterSpacing: 0,
        theme: getTerminalTheme(themeSurface),
        scrollback: 10000,
        allowProposedApi: true,
        convertEol: false,
        altClickMovesCursor: true,
        drawBoldTextInBrightColors: true,
        minimumContrastRatio: 1,
      });

      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;

      terminal.loadAddon(new WebLinksAddon());

      const unicode11Addon = new Unicode11Addon();
      terminal.loadAddon(unicode11Addon);
      terminal.unicode.activeVersion = "11";

      xtermRef.current = terminal;

      if (termRef.current) {
        const applyTheme = () => {
          if (!terminal) return;
          const nextTheme = getTerminalTheme(themeSurface);
          terminal.options.theme = nextTheme;
          termRef.current?.style.setProperty("background-color", nextTheme.background);
          termRef.current?.style.setProperty("color", nextTheme.foreground);
        };

        applyTheme();
        terminal.open(termRef.current);
        applyTheme();

        themeObserver = new MutationObserver(() => {
          requestAnimationFrame(() => {
            if (!disposed) applyTheme();
          });
        });
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class", "style", "data-custom-theme"],
        });

        // Initial fit after a tick (ensures DOM is ready)
        requestAnimationFrame(() => {
          if (!disposed) {
            fitAddon.fit();
            connectWebSocket();
          }
        });

        // Handle resize
        resizeObserver = new ResizeObserver(() => {
          if (!disposed) {
            requestAnimationFrame(() => {
              if (!disposed) {
                fitAddon.fit();
                if (ws?.readyState === WebSocket.OPEN && terminal) {
                  ws.send(
                    JSON.stringify({
                      type: "resize",
                      cols: terminal.cols,
                      rows: terminal.rows,
                    })
                  );
                }
              }
            });
          }
        });
        resizeObserver.observe(termRef.current);
      }

      function connectWebSocket(retryAttempt = 0) {
        if (disposed || !terminal) return;

        setConnState("connecting");

        void (async () => {
          const id = sessionId || `session-${Date.now()}`;

          try {
            const authResponse = await fetch("/api/daemon/auth");
            if (!authResponse.ok) {
              throw new Error(`Auth failed (${authResponse.status})`);
            }

            const auth = (await authResponse.json()) as DaemonAuthPayload;
            const params = new URLSearchParams({ id, token: auth.token });
            if (prompt && !reconnect) params.set("prompt", prompt);
            if (providerId && !reconnect) params.set("providerId", providerId);

            const wsOrigin =
              auth.wsOrigin ||
              (window.location.protocol === "https:"
                ? `wss://${window.location.host}`
                : `ws://${window.location.host}`);
            const wsUrl = `${wsOrigin}/api/daemon/pty?${params.toString()}`;

            if (retryAttempt === 0) {
              terminal?.write(`\x1b[90mConnecting to daemon...\x1b[0m\r\n`);
            } else {
              terminal?.write(`\x1b[90mRetrying (${retryAttempt}/${MAX_WS_RETRIES})...\x1b[0m\r\n`);
            }

            ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.binaryType = "arraybuffer";

            // Timeout: if no open event within 5s, consider it failed
            const connectTimeout = setTimeout(() => {
              if (ws && ws.readyState !== WebSocket.OPEN) {
                ws.close();
              }
            }, 5000);

            ws.onopen = () => {
              clearTimeout(connectTimeout);
              if (disposed) return;
              retryCountRef.current = 0;
              setConnState("connected");
              setErrorMsg(null);
              if (terminal) {
                ws?.send(
                  JSON.stringify({
                    type: "resize",
                    cols: terminal.cols,
                    rows: terminal.rows,
                  })
                );
              }
            };

            ws.onmessage = (event) => {
              if (disposed || !terminal) return;
              if (event.data instanceof ArrayBuffer) {
                terminal.write(new Uint8Array(event.data));
              } else {
                terminal.write(replacePastedTextNotice(event.data, displayPrompt));
              }
            };

            ws.onerror = () => {
              clearTimeout(connectTimeout);
              if (disposed) return;

              if (retryAttempt < MAX_WS_RETRIES) {
                // Auto-retry with backoff
                setConnState("connecting");
                wsRetryTimer = setTimeout(() => {
                  if (!disposed && !sessionFinished) {
                    connectWebSocket(retryAttempt + 1);
                  }
                }, WS_RETRY_DELAY_MS * (retryAttempt + 1));
              } else {
                // All retries exhausted — fall back to HTTP polling
                terminal?.write(
                  "\r\n\x1b[33mWebSocket unavailable, switching to HTTP streaming...\x1b[0m\r\n"
                );
                startHttpFallback(id);
              }
            };

            ws.onclose = (event) => {
              clearTimeout(connectTimeout);
              if (disposed) return;
              // Code 1006 = abnormal close (connection never established properly)
              if (event.code === 1006 && retryAttempt < MAX_WS_RETRIES && !sessionFinished) {
                setConnState("connecting");
                wsRetryTimer = setTimeout(() => {
                  if (!disposed && !sessionFinished) {
                    connectWebSocket(retryAttempt + 1);
                  }
                }, WS_RETRY_DELAY_MS * (retryAttempt + 1));
                return;
              }
              finishSession(false);
            };

            // Status polling to detect when session completes
            if (!statusPollHandle) {
              statusPollHandle = setInterval(() => {
                if (disposed || sessionFinished) return;
                void (async () => {
                  try {
                    const response = await fetch(`/api/daemon/session/${id}/output`);
                    if (!response.ok) return;
                    const data = (await response.json()) as SessionOutputPayload;
                    if (data.status && data.status !== "running") {
                      finishSession(true);
                    }
                  } catch {
                    // Ignore transient polling failures
                  }
                })();
              }, STATUS_POLL_INTERVAL_MS);
            }
          } catch (err) {
            if (disposed) return;
            const msg = err instanceof Error ? err.message : "Connection failed";
            setConnState("error");
            setErrorMsg(msg);
            terminal?.write(
              `\r\n\x1b[31m${msg}\x1b[0m\r\n\x1b[90mIs the daemon running? Use: npm run dev:all\x1b[0m\r\n`
            );
          }
        })();

        terminal.onData((data) => {
          if (ws?.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });
      }
    };

    init();

    return () => {
      disposed = true;
      if (statusPollHandle) clearInterval(statusPollHandle);
      if (httpPollHandle) clearInterval(httpPollHandle);
      if (wsRetryTimer) clearTimeout(wsRetryTimer);
      httpFallbackActiveRef.current = false;
      resizeObserver?.disconnect();
      themeObserver?.disconnect();
      ws?.close();
      terminal?.dispose();
      wsRef.current = null;
      xtermRef.current = null;
      fitAddonRef.current = null;
    };
  }, [sessionId, prompt, displayPrompt, providerId, reconnect, themeSurface, retryKey]);

  const surfaceBackground = themeSurface === "page" ? "var(--background)" : "var(--terminal-bg)";
  const surfaceForeground = themeSurface === "page" ? "var(--foreground)" : "var(--terminal-fg)";

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{
        backgroundColor: surfaceBackground,
        color: surfaceForeground,
        minHeight: 100,
      }}
    >
      {/* Connection status overlay */}
      {connState === "connecting" && (
        <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 rounded-lg bg-background/80 px-4 py-2 text-xs text-muted-foreground backdrop-blur-sm border border-border">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
            Connecting to daemon...
          </div>
        </div>
      )}

      {/* Error overlay with retry */}
      {connState === "error" && errorMsg && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 rounded-lg bg-background/90 px-6 py-4 text-center backdrop-blur-sm border border-destructive/30">
            <div className="text-xs text-destructive font-medium">{errorMsg}</div>
            <button
              onClick={handleRetry}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      <div
        ref={termRef}
        className="h-full w-full overflow-hidden"
        style={{ padding: "4px 8px", minHeight: 100 }}
      />
    </div>
  );
}
