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
  Languages,
  Feather,
  Check,
  X,
  AlertCircle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const TranslationSchema = z.object({
  locale: z.string().regex(/^[a-z]{2}_[a-z]{2}$/, "Format: en_us, fr_fr…"),
  text: z
    .string()
    .min(1, "Translation text is required")
    .max(500, "Maximum 500 characters"),
});

type ZodErrors = Partial<Record<keyof z.infer<typeof TranslationSchema>, string>>;

const STACK = [
  { name: "shadcn/ui", desc: "Components" },
  { name: "zustand", desc: "State" },
  { name: "sileo", desc: "Toasts" },
  { name: "zod", desc: "Validation" },
  { name: "arctic", desc: "OAuth" },
  { name: "@tanstack/hotkeys", desc: "Shortcuts" },
  { name: "lucide-react", desc: "Icons" },
];

function DemoCard({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl bg-white border border-stone-200/80",
        "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)]",
        "hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.05)]",
        "transition-shadow duration-300",
        className
      )}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-stone-100">
        <span className="text-stone-400">{icon}</span>
        <span className="text-stone-700 text-sm font-medium tracking-tight">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center text-[11px] px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-600 font-mono">
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

export default function DemoPage() {
  const [lastToast, setLastToast] = useState<string | null>(null);

  const toastDemos = [
    {
      label: "success",
      icon: Check,
      color: "text-emerald-600",
      bg: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
      fn: () => {
        setLastToast("success");
        sileo.success({ title: "Translation saved", description: "fr_fr · hello.world" });
      },
    },
    {
      label: "error",
      icon: X,
      color: "text-rose-600",
      bg: "bg-rose-50 hover:bg-rose-100 border-rose-200",
      fn: () => {
        setLastToast("error");
        sileo.error({ title: "Placeholder mismatch", description: "Expected %s — got none" });
      },
    },
    {
      label: "warning",
      icon: AlertCircle,
      color: "text-amber-600",
      bg: "bg-amber-50 hover:bg-amber-100 border-amber-200",
      fn: () => {
        setLastToast("warning");
        sileo.warning({ title: "Rate limit", description: "5 suggestions per minute" });
      },
    },
    {
      label: "info",
      icon: Info,
      color: "text-sky-600",
      bg: "bg-sky-50 hover:bg-sky-100 border-sky-200",
      fn: () => {
        setLastToast("info");
        sileo.info({ title: "15 pending", description: "Suggestions awaiting review" });
      },
    },
    {
      label: "action",
      icon: Sparkles,
      color: "text-violet-600",
      bg: "bg-violet-50 hover:bg-violet-100 border-violet-200",
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
      icon: Zap,
      color: "text-orange-600",
      bg: "bg-orange-50 hover:bg-orange-100 border-orange-200",
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

  const { user, loaded, fetchUser } = useSessionStore();

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

  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-800">
      <div className="fixed inset-0 pointer-events-none opacity-[0.35]">
        <svg className="w-full h-full" aria-hidden>
          <filter id="paper">
            <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise" />
            <feDiffuseLighting in="noise" lightingColor="#d4c8b8" surfaceScale="1.5">
              <feDistantLight azimuth="45" elevation="60" />
            </feDiffuseLighting>
          </filter>
          <rect width="100%" height="100%" filter="url(#paper)" />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24">
          <header className="mb-16 md:mb-20">
            <div className="flex items-center gap-2 mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-stone-400 text-xs tracking-widest uppercase font-medium">
                Stack Demo · All Systems Go
              </span>
            </div>

            <h1 className="text-[clamp(2.75rem,8vw,5.5rem)] font-semibold leading-[0.95] tracking-tight mb-6 text-stone-900">
              <span className="font-serif italic text-stone-700">i18n</span>
              <span className="text-stone-300">.</span>
              <span>kaf</span>
              <span className="text-stone-300">.</span>
              <span>sh</span>
            </h1>

            <p className="text-stone-500 text-lg max-w-md leading-relaxed mb-8">
              Translation atelier for Minecraft mods.
              <br />
              <span className="text-stone-400">Every dependency — wired, live, interactive.</span>
            </p>

            <div className="flex flex-wrap gap-2">
              {STACK.map((dep) => (
                <span
                  key={dep.name}
                  className="text-xs px-3 py-1.5 rounded-full border border-stone-200 bg-white text-stone-600 shadow-sm"
                >
                  {dep.name}
                </span>
              ))}
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <DemoCard icon={<Bell className="w-4 h-4" />} title="sileo · Toast Notifications">
              <div className="grid grid-cols-3 gap-2">
                {toastDemos.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.label}
                      onClick={t.fn}
                      className={cn(
                        "flex items-center justify-center gap-1.5 text-xs py-2.5 px-2 rounded-xl border transition-all duration-150",
                        t.bg,
                        lastToast === t.label && "ring-2 ring-offset-2 ring-stone-300"
                      )}
                    >
                      <Icon className={cn("w-3.5 h-3.5", t.color)} />
                      <span className={t.color}>.{t.label}()</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-stone-400 mt-3">Click any method — or trigger via hotkeys</p>
            </DemoCard>

            <DemoCard icon={<Keyboard className="w-4 h-4" />} title="@tanstack/react-hotkeys">
              <div className="space-y-1 mb-4">
                {[
                  { key: "⌘K / Ctrl+K", label: "Command palette" },
                  { key: "⌘S / Ctrl+S", label: "Save changes" },
                  { key: "?", label: "Help" },
                ].map((h) => (
                  <div
                    key={h.key}
                    className="flex items-center justify-between py-2.5 border-b border-stone-100 last:border-0"
                  >
                    <span className="text-stone-500 text-sm">{h.label}</span>
                    <Kbd>{h.key}</Kbd>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-stone-400">↑ try them now</span>
                <div
                  className={cn(
                    "font-mono text-sm px-4 py-1.5 rounded-lg border transition-all duration-300",
                    keyFlash
                      ? "border-stone-400 bg-stone-100 text-stone-700"
                      : "border-stone-200 text-stone-300"
                  )}
                >
                  {lastKey ?? "—"}
                </div>
              </div>
            </DemoCard>

            <DemoCard icon={<ShieldCheck className="w-4 h-4" />} title="zod · Runtime Validation">
              <form onSubmit={handleZodSubmit} className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="fr_fr"
                    value={formData.locale}
                    onChange={(e) => setFormData((p) => ({ ...p, locale: e.target.value }))}
                    className={cn(
                      "font-mono text-sm w-24 shrink-0",
                      "bg-white border-stone-200 text-stone-800",
                      "placeholder:text-stone-300 focus-visible:ring-stone-300",
                      zodErrors.locale && "border-rose-300"
                    )}
                  />
                  <Input
                    placeholder="Translation text…"
                    value={formData.text}
                    onChange={(e) => setFormData((p) => ({ ...p, text: e.target.value }))}
                    className={cn(
                      "font-mono text-sm flex-1",
                      "bg-white border-stone-200 text-stone-800",
                      "placeholder:text-stone-300 focus-visible:ring-stone-300",
                      zodErrors.text && "border-rose-300"
                    )}
                  />
                </div>

                <div className="min-h-[20px]">
                  {(zodErrors.locale || zodErrors.text) && (
                    <p className="text-[11px] text-rose-500 flex items-center gap-1">
                      <X className="w-3 h-3" /> {zodErrors.locale ?? zodErrors.text}
                    </p>
                  )}
                  {zodSuccess && (
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Valid — would POST to /api/suggestions
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full text-xs font-medium py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all flex items-center justify-center gap-1.5"
                >
                  Validate schema <ArrowRight className="w-3 h-3" />
                </button>
              </form>
            </DemoCard>

            <DemoCard icon={<Database className="w-4 h-4" />} title="zustand · Session Store">
              <div className="space-y-3">
                <div className="font-mono text-xs rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-stone-400">useSessionStore()</span>
                    <span
                      className={cn(
                        "text-[10px] px-2 py-0.5 rounded-full",
                        loaded
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-stone-100 text-stone-400"
                      )}
                    >
                      {loaded ? "loaded" : "idle"}
                    </span>
                  </div>
                  <div className="h-px bg-stone-200" />
                  <div className="flex justify-between">
                    <span className="text-stone-400">user</span>
                    <span className={user ? "text-stone-700" : "text-stone-300"}>
                      {user ? `"${user.name}"` : "null"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">loaded</span>
                    <span className={loaded ? "text-emerald-600" : "text-stone-300"}>
                      {String(loaded)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={fetchUser}
                  className="w-full text-xs font-medium py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:border-stone-300 transition-all"
                >
                  fetchUser()
                </button>
              </div>
            </DemoCard>

            <DemoCard
              icon={<Layers className="w-4 h-4" />}
              title="shadcn/ui + lucide-react"
              className="md:col-span-2"
            >
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] text-stone-400 mb-2.5 uppercase tracking-widest font-medium">
                    Button
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="default" className="text-xs h-8 bg-stone-800 hover:bg-stone-700">
                      Default
                    </Button>
                    <Button size="sm" variant="secondary" className="text-xs h-8">
                      Secondary
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-8">
                      Outline
                    </Button>
                    <Button size="sm" variant="ghost" className="text-xs h-8">
                      Ghost
                    </Button>
                    <Button size="sm" variant="destructive" className="text-xs h-8">
                      Destructive
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-stone-400 mb-2.5 uppercase tracking-widest font-medium">
                    Badge
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="text-[10px] bg-stone-100 text-stone-600 hover:bg-stone-100">pending</Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      accepted
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      fr_fr
                    </Badge>
                    <Badge variant="destructive" className="text-[10px]">
                      rejected
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] text-stone-400 mb-2.5 uppercase tracking-widest font-medium">
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
                      Languages,
                      Feather,
                    ].map((Icon, i) => (
                      <div
                        key={i}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-400 hover:text-stone-600 hover:border-stone-300 hover:bg-stone-50 transition-all duration-150 cursor-default"
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DemoCard>

            <DemoCard
              icon={<LogIn className="w-4 h-4" />}
              title="arctic · Discord OAuth2"
              className="md:col-span-2"
            >
              <div className="flex flex-wrap items-center gap-6">
                <a
                  href="/api/auth/discord"
                  className="inline-flex items-center gap-2.5 text-sm font-medium px-5 py-2.5 rounded-xl border border-[#5865F2]/30 bg-[#5865F2]/5 text-[#5865F2] hover:bg-[#5865F2]/10 hover:border-[#5865F2]/50 transition-all duration-150 shrink-0"
                >
                  <DiscordIcon className="w-4 h-4" />
                  Login with Discord
                </a>

                <div className="text-[11px] text-stone-400 space-y-1.5 border-l border-stone-200 pl-6">
                  <div>
                    <span className="text-stone-500">→</span> GET /api/auth/discord
                    <span className="text-stone-300"> — state cookie + redirect</span>
                  </div>
                  <div>
                    <span className="text-stone-500">→</span> GET /api/auth/callback
                    <span className="text-stone-300"> — CSRF check + token exchange</span>
                  </div>
                  <div>
                    <span className="text-stone-500">→</span>{" "}
                    <span className="text-stone-600">__session</span>
                    <span className="text-stone-300"> — JWT, httpOnly, 7 days</span>
                  </div>
                </div>
              </div>
            </DemoCard>
          </div>

          <footer className="mt-16 pt-8 border-t border-stone-200/60 flex justify-between items-center">
            <span className="text-[11px] text-stone-400">
              Next.js 16 · React 19 · Cloudflare Workers · D1
            </span>
            <span className="text-[11px] text-stone-400 font-serif italic">
              i18n.kaf.sh
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
