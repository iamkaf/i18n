"use client";

import { useState } from "react";
import { useHotkey } from "@tanstack/react-hotkeys";
import { sileo } from "sileo";
import { useSessionStore } from "@/lib/store";
import { z } from "zod";
import {
  Bell,
  Keyboard,
  ShieldCheck,
  Database,
  Layers,
  LogIn,
  Globe2,
  KeyRound,
  Sparkles,
  Zap,
  Code2,
  Hash,
  Type,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

// ── Zod schema ──────────────────────────────────────────────────────────────

const TranslationSchema = z.object({
  locale: z.string().regex(/^[a-z]{2}_[a-z]{2}$/, "Format: en_us, fr_fr…"),
  text: z
    .string()
    .min(1, "Translation text is required")
    .max(500, "Maximum 500 characters"),
});

type ZodErrors = Partial<Record<keyof z.infer<typeof TranslationSchema>, string>>;

// ── Sub-components ──────────────────────────────────────────────────────────

function DemoCard({
  icon,
  index,
  title,
  subtitle,
  children,
  wide = false,
}: {
  icon: React.ReactNode;
  index: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative rounded-xl border border-[rgba(232,160,32,0.1)] bg-[#111009]",
        "hover:border-[rgba(232,160,32,0.28)] transition-colors duration-300",
        "overflow-hidden",
        wide && "md:col-span-2",
      )}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(232,160,32,0.06),transparent)]" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[rgba(255,255,255,0.04)]">
        <span className="text-[#e8a020]/50 group-hover:text-[#e8a020]/80 transition-colors">
          {icon}
        </span>
        <span
          className="text-[#f0e8d8] text-sm tracking-wide"
          style={{ fontFamily: "var(--font-syne)" }}
        >
          {title}
        </span>
        <span className="ml-auto font-mono text-[10px] text-[#5a4e3a] text-right leading-tight whitespace-pre">
          {subtitle}
        </span>
        <span className="font-mono text-[10px] text-[#2a2218] select-none">
          {String(index).padStart(2, "0")}
        </span>
      </div>

      {/* Body */}
      <div className="p-5">{children}</div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#1c1810] border border-[rgba(255,255,255,0.1)] text-[#e8a020]/80 shadow-[inset_0_-1px_0_rgba(0,0,0,0.4)]">
      {children}
    </kbd>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.995a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────

const STACK = [
  "shadcn/ui",
  "zustand",
  "sileo",
  "zod",
  "arctic",
  "@tanstack/hotkeys",
  "lucide-react",
];

export default function DemoPage() {
  // ── Sileo ──────────────────────────────────────
  const [lastToast, setLastToast] = useState<string | null>(null);

  const toastDemos = [
    {
      label: "success",
      color: "text-emerald-400/80",
      fn: () => {
        setLastToast("success");
        sileo.success({ title: "Translation saved", description: "fr_fr · hello.world" });
      },
    },
    {
      label: "error",
      color: "text-red-400/80",
      fn: () => {
        setLastToast("error");
        sileo.error({ title: "Placeholder mismatch", description: "Expected %s — got none" });
      },
    },
    {
      label: "warning",
      color: "text-amber-400/80",
      fn: () => {
        setLastToast("warning");
        sileo.warning({ title: "Rate limit", description: "5 suggestions per minute" });
      },
    },
    {
      label: "info",
      color: "text-sky-400/80",
      fn: () => {
        setLastToast("info");
        sileo.info({ title: "15 pending", description: "Suggestions awaiting review" });
      },
    },
    {
      label: "action",
      color: "text-violet-400/80",
      fn: () => {
        setLastToast("action");
        sileo.action({
          title: "Approve translation?",
          description: "fr_fr · Bonjour le monde",
          button: {
            title: "Approve",
            onClick: () => sileo.success({ title: "Approved!", description: "Translation published" }),
          },
        });
      },
    },
    {
      label: "promise",
      color: "text-orange-400/80",
      fn: () => {
        setLastToast("promise");
        sileo.promise(fetch("/api/health").then((r) => r.json()), {
          loading: { title: "Pinging /api/health…" },
          success: { title: "Service is healthy" },
          error: { title: "Health check failed" },
        });
      },
    },
  ];

  // ── Hotkeys ────────────────────────────────────
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [keyFlash, setKeyFlash] = useState(false);

  const flashKey = (label: string) => {
    setLastKey(label);
    setKeyFlash(true);
    setTimeout(() => setKeyFlash(false), 700);
  };

  useHotkey("Mod+K", (e) => {
    e.preventDefault();
    flashKey("⌘K");
    sileo.info({ title: "Command palette", description: "⌘K opens it from anywhere" });
  });

  useHotkey("Mod+S", (e) => {
    e.preventDefault();
    flashKey("⌘S");
    sileo.success({ title: "Saved", description: "All translations persisted" });
  });

  useHotkey({ key: "?", shift: true }, () => {
    flashKey("?");
    sileo.action({
      title: "Need help?",
      description: "View the full documentation",
      button: { title: "Open docs", onClick: () => {} },
    });
  });

  // ── Zustand ────────────────────────────────────
  const { user, loaded, fetchUser } = useSessionStore();

  // ── Zod ────────────────────────────────────────
  const [formData, setFormData] = useState({ locale: "", text: "" });
  const [zodErrors, setZodErrors] = useState<ZodErrors>({});
  const [zodSuccess, setZodSuccess] = useState(false);

  const handleZodSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setZodSuccess(false);
    const result = TranslationSchema.safeParse(formData);
    if (!result.success) {
      const errs: ZodErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ZodErrors;
        if (!errs[field]) errs[field] = issue.message;
      }
      setZodErrors(errs);
      sileo.error({ title: "Invalid payload", description: result.error.issues[0].message });
    } else {
      setZodErrors({});
      setZodSuccess(true);
      sileo.success({
        title: "Schema valid",
        description: `${result.data.locale} · "${result.data.text}"`,
      });
      setFormData({ locale: "", text: "" });
    }
  };

  // ── Render ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0c0a07] text-[#f0e8d8]">
      {/* Atmospheric layers */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_45%_at_50%_-5%,rgba(232,160,32,0.09),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(232,160,32,0.12)] to-transparent" />
        <svg className="absolute inset-0 w-full h-full opacity-[0.028]" aria-hidden>
          <filter id="pg-noise">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.85"
              numOctaves="4"
              stitchTiles="stitch"
            />
          </filter>
          <rect width="100%" height="100%" filter="url(#pg-noise)" />
        </svg>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        {/* ── Hero ──────────────────────────────────── */}
        <header className="mb-16">
          <div className="flex items-center gap-2.5 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e8a020] opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e8a020]" />
            </span>
            <span className="font-mono text-[10px] text-[#5a4e3a] tracking-[0.25em] uppercase">
              Stack Demo · All Systems Go
            </span>
          </div>

          <h1
            className="text-[clamp(3.5rem,10vw,7rem)] font-extrabold leading-[0.9] tracking-tighter mb-5"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            <span className="text-[#e8a020]">i18n</span>
            <span className="text-[rgba(240,232,216,0.12)]">.</span>
            <span>kaf</span>
            <span className="text-[rgba(240,232,216,0.12)]">.</span>
            <span>sh</span>
          </h1>

          <p className="font-mono text-[#6b5a42] text-sm max-w-sm leading-relaxed mb-7">
            Translation atelier for Minecraft mods.
            <br />
            Every dependency — wired, live, interactive.
          </p>

          <div className="flex flex-wrap gap-2">
            {STACK.map((dep) => (
              <span
                key={dep}
                className="font-mono text-[11px] px-2.5 py-1 rounded-md border border-[rgba(232,160,32,0.15)] text-[#e8a020]/60 bg-[rgba(232,160,32,0.04)] tracking-wide"
              >
                {dep}
              </span>
            ))}
          </div>
        </header>

        {/* ── Grid ──────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* 01 — Sileo */}
          <DemoCard
            index={1}
            icon={<Bell className="w-4 h-4" />}
            title="sileo"
            subtitle={"Physics-based\ntoast notifications"}
          >
            <div className="grid grid-cols-3 gap-2">
              {toastDemos.map((t) => (
                <button
                  key={t.label}
                  onClick={t.fn}
                  className={cn(
                    "font-mono text-[11px] py-2 px-1 rounded-lg border transition-all duration-150 text-center",
                    "border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)]",
                    "hover:border-[rgba(232,160,32,0.3)] hover:bg-[rgba(232,160,32,0.06)]",
                    lastToast === t.label &&
                      "border-[rgba(232,160,32,0.4)] bg-[rgba(232,160,32,0.08)]",
                    t.color,
                  )}
                >
                  .{t.label}()
                </button>
              ))}
            </div>
            <p className="font-mono text-[10px] text-[#3a3028] mt-3">
              Click any method — or trigger via hotkeys
            </p>
          </DemoCard>

          {/* 02 — TanStack Hotkeys */}
          <DemoCard
            index={2}
            icon={<Keyboard className="w-4 h-4" />}
            title="@tanstack/react-hotkeys"
            subtitle={"Type-safe keyboard\nshortcuts"}
          >
            <div className="space-y-1 mb-4">
              {[
                { key: "⌘K / Ctrl+K", label: "Command palette" },
                { key: "⌘S / Ctrl+S", label: "Save changes" },
                { key: "?", label: "Help" },
              ].map((h) => (
                <div
                  key={h.key}
                  className="flex items-center justify-between py-2 border-b border-[rgba(255,255,255,0.04)] last:border-0"
                >
                  <span className="text-[#6b5a42] text-xs">{h.label}</span>
                  <Kbd>{h.key}</Kbd>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#3a3028]">↑ try them now</span>
              <div
                className={cn(
                  "font-mono text-sm px-4 py-1.5 rounded-lg border transition-all duration-300",
                  keyFlash
                    ? "border-[#e8a020] text-[#e8a020] bg-[rgba(232,160,32,0.12)] shadow-[0_0_12px_rgba(232,160,32,0.2)]"
                    : "border-[rgba(255,255,255,0.07)] text-[#3a3028]",
                )}
              >
                {lastKey ?? "—"}
              </div>
            </div>
          </DemoCard>

          {/* 03 — Zod */}
          <DemoCard
            index={3}
            icon={<ShieldCheck className="w-4 h-4" />}
            title="zod"
            subtitle={"Runtime schema\nvalidation"}
          >
            <form onSubmit={handleZodSubmit} className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="fr_fr"
                  value={formData.locale}
                  onChange={(e) => setFormData((p) => ({ ...p, locale: e.target.value }))}
                  className={cn(
                    "font-mono text-sm w-24 shrink-0",
                    "bg-[#0c0a07] border-[rgba(255,255,255,0.08)] text-[#f0e8d8]",
                    "placeholder:text-[#3a3028] focus-visible:ring-[rgba(232,160,32,0.4)] focus-visible:border-[rgba(232,160,32,0.4)]",
                    zodErrors.locale && "border-red-500/40",
                  )}
                />
                <Input
                  placeholder="Translation text…"
                  value={formData.text}
                  onChange={(e) => setFormData((p) => ({ ...p, text: e.target.value }))}
                  className={cn(
                    "font-mono text-sm flex-1",
                    "bg-[#0c0a07] border-[rgba(255,255,255,0.08)] text-[#f0e8d8]",
                    "placeholder:text-[#3a3028] focus-visible:ring-[rgba(232,160,32,0.4)] focus-visible:border-[rgba(232,160,32,0.4)]",
                    zodErrors.text && "border-red-500/40",
                  )}
                />
              </div>

              <div className="min-h-[18px]">
                {(zodErrors.locale || zodErrors.text) && (
                  <p className="font-mono text-[11px] text-red-400/70">
                    ✗ {zodErrors.locale ?? zodErrors.text}
                  </p>
                )}
                {zodSuccess && (
                  <p className="font-mono text-[11px] text-emerald-400/70">
                    ✓ Valid — would POST to /api/suggestions
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="w-full font-mono text-xs py-2 rounded-lg border border-[rgba(232,160,32,0.2)] bg-[rgba(232,160,32,0.06)] text-[#e8a020]/80 hover:bg-[rgba(232,160,32,0.12)] hover:border-[rgba(232,160,32,0.35)] transition-all flex items-center justify-center gap-1.5"
              >
                Validate schema <ArrowRight className="w-3 h-3" />
              </button>
            </form>
          </DemoCard>

          {/* 04 — Zustand */}
          <DemoCard
            index={4}
            icon={<Database className="w-4 h-4" />}
            title="zustand"
            subtitle={"Session store\nglobal state"}
          >
            <div className="space-y-3">
              <div className="font-mono text-xs rounded-lg border border-[rgba(255,255,255,0.05)] bg-[#0c0a07] p-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#3a3028]">useSessionStore()</span>
                  <span
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border",
                      loaded
                        ? "border-emerald-500/30 text-emerald-400/70 bg-emerald-500/5"
                        : "border-[rgba(255,255,255,0.07)] text-[#5a4e3a]",
                    )}
                  >
                    {loaded ? "loaded" : "idle"}
                  </span>
                </div>
                <div className="h-px bg-[rgba(255,255,255,0.04)]" />
                <div className="flex justify-between">
                  <span className="text-[#5a4e3a]">user</span>
                  <span className={user ? "text-[#e8a020]" : "text-[#3a3028]"}>
                    {user ? `"${user.name}"` : "null"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#5a4e3a]">loaded</span>
                  <span className={loaded ? "text-emerald-400/80" : "text-[#3a3028]"}>
                    {String(loaded)}
                  </span>
                </div>
              </div>

              <button
                onClick={fetchUser}
                className="w-full font-mono text-xs py-2 rounded-lg border border-[rgba(232,160,32,0.2)] bg-[rgba(232,160,32,0.06)] text-[#e8a020]/80 hover:bg-[rgba(232,160,32,0.12)] hover:border-[rgba(232,160,32,0.35)] transition-all"
              >
                fetchUser()
              </button>
            </div>
          </DemoCard>

          {/* 05 — shadcn/ui + Lucide (full width) */}
          <DemoCard
            index={5}
            icon={<Layers className="w-4 h-4" />}
            title="shadcn/ui + lucide-react"
            subtitle={"Radix primitives · Tailwind v4\nCopy-paste components"}
            wide
          >
            <div className="space-y-5">
              <div>
                <p className="font-mono text-[10px] text-[#3a3028] mb-2.5 uppercase tracking-widest">
                  Button
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="default" className="font-mono text-xs h-8">
                    Default
                  </Button>
                  <Button size="sm" variant="secondary" className="font-mono text-xs h-8">
                    Secondary
                  </Button>
                  <Button size="sm" variant="outline" className="font-mono text-xs h-8">
                    Outline
                  </Button>
                  <Button size="sm" variant="ghost" className="font-mono text-xs h-8">
                    Ghost
                  </Button>
                  <Button size="sm" variant="destructive" className="font-mono text-xs h-8">
                    Destructive
                  </Button>
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] text-[#3a3028] mb-2.5 uppercase tracking-widest">
                  Badge
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="font-mono text-[10px]">pending</Badge>
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    accepted
                  </Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    fr_fr
                  </Badge>
                  <Badge variant="destructive" className="font-mono text-[10px]">
                    rejected
                  </Badge>
                </div>
              </div>

              <div>
                <p className="font-mono text-[10px] text-[#3a3028] mb-2.5 uppercase tracking-widest">
                  Lucide icons
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    Globe2,
                    KeyRound,
                    Bell,
                    Layers,
                    ShieldCheck,
                    Database,
                    Keyboard,
                    Sparkles,
                    Zap,
                    Code2,
                    Hash,
                    Type,
                  ].map((Icon, i) => (
                    <div
                      key={i}
                      className="w-9 h-9 flex items-center justify-center rounded-lg border border-[rgba(232,160,32,0.1)] bg-[rgba(232,160,32,0.03)] text-[#e8a020]/40 hover:text-[#e8a020]/80 hover:border-[rgba(232,160,32,0.3)] hover:bg-[rgba(232,160,32,0.07)] transition-all duration-150 cursor-default"
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DemoCard>

          {/* 06 — Arctic / Discord OAuth (full width) */}
          <DemoCard
            index={6}
            icon={<LogIn className="w-4 h-4" />}
            title="arctic"
            subtitle={"Discord OAuth2 · JWT\nhttpOnly session cookies"}
            wide
          >
            <div className="flex flex-wrap items-center gap-6">
              <a
                href="/api/auth/discord"
                className="inline-flex items-center gap-2.5 font-mono text-sm px-5 py-2.5 rounded-xl border border-[rgba(88,101,242,0.4)] bg-[rgba(88,101,242,0.08)] text-[#8b96f8] hover:bg-[rgba(88,101,242,0.16)] hover:border-[rgba(88,101,242,0.6)] transition-all duration-150 shrink-0"
              >
                <DiscordIcon className="w-4 h-4" />
                Login with Discord
              </a>

              <div className="font-mono text-[11px] text-[#3a3028] space-y-1.5 border-l border-[rgba(255,255,255,0.04)] pl-6">
                <div>
                  <span className="text-[#5a4e3a]">→</span> GET /api/auth/discord
                  <span className="text-[#2a2218]"> — state cookie + redirect</span>
                </div>
                <div>
                  <span className="text-[#5a4e3a]">→</span> GET /api/auth/callback
                  <span className="text-[#2a2218]"> — CSRF check + token exchange</span>
                </div>
                <div>
                  <span className="text-[#5a4e3a]">→</span>{" "}
                  <span className="text-[#e8a020]/40">__session</span>
                  <span className="text-[#2a2218]"> — JWT, httpOnly, 7 days</span>
                </div>
              </div>
            </div>
          </DemoCard>
        </div>

        {/* ── Footer ──────────────────────────────────── */}
        <footer className="mt-14 pt-7 border-t border-[rgba(255,255,255,0.04)] flex justify-between items-center">
          <span className="font-mono text-[10px] text-[#2a2218]">
            Next.js 16 · React 19 · Cloudflare Workers · D1
          </span>
          <span
            className="font-mono text-[10px] text-[#3a3028]"
            style={{ fontFamily: "var(--font-syne)" }}
          >
            i18n.kaf.sh
          </span>
        </footer>
      </div>
    </div>
  );
}
