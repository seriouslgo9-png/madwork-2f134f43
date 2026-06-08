import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { LogOut, Youtube, Zap } from "lucide-react";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Lightning } from "@/components/Lightning";
import { Marquee } from "@/components/Marquee";
import { DownloaderCard } from "@/components/DownloaderCard";
import { RecentDownloads, type RecentItem } from "@/components/RecentDownloads";
import { isBackendConfigured } from "@/lib/download-api";
import { supabase } from "@/integrations/supabase/client";
import { playWelcome } from "@/lib/welcome-sound";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "NeonTube Downloader — Fast MP3 & MP4 YouTube Downloads" },
      {
        name: "description",
        content:
          "Download YouTube videos instantly in MP4 or MP3 with multiple quality options. Glassmorphism + neon cyberpunk UI.",
      },
      { property: "og:title", content: "NeonTube Downloader" },
      {
        property: "og:description",
        content: "Fast, High Quality, MP3 & MP4 Downloads.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [userName, setUserName] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const welcomedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      const name =
        (data.user.user_metadata?.full_name as string | undefined) ||
        (data.user.user_metadata?.name as string | undefined) ||
        data.user.email?.split("@")[0] ||
        "friend";
      setUserName(name);
      setChecking(false);
      // Play welcome once per page mount after a fresh login
      const flag = sessionStorage.getItem("neontube_welcomed");
      if (!flag && !welcomedRef.current) {
        welcomedRef.current = true;
        sessionStorage.setItem("neontube_welcomed", "1");
        playWelcome(name);
      }
    });
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const addRecent = (item: Omit<RecentItem, "id" | "at">) => {
    setRecent((r) =>
      [{ ...item, id: crypto.randomUUID(), at: Date.now() }, ...r].slice(0, 6)
    );
  };

  const handleSignOut = async () => {
    sessionStorage.removeItem("neontube_welcomed");
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth" });
  };

  if (checking) {
    return (
      <div className="relative flex min-h-screen items-center justify-center animated-bg">
        <Lightning />
        <div className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Charging the grid…
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen animated-bg">
      <ParticleBackground />
      <Lightning />
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: "oklch(0.18 0.05 280 / 0.85)",
            border: "1px solid oklch(0.72 0.22 310 / 0.4)",
            color: "oklch(0.97 0.02 280)",
            backdropFilter: "blur(20px)",
          },
        }}
      />

      <Marquee />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="gradient-neon flex size-10 items-center justify-center rounded-xl neon-glow-purple">
            <Youtube className="size-5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">MadWork</p>
            <h1 className="font-bold text-gradient-neon">NeonTube</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="glass hidden items-center gap-2 rounded-full px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground sm:flex">
            <Zap className="size-3.5 text-[var(--neon-blue)]" />
            <span className="text-foreground">{userName}</span>
          </div>
          <Button
            onClick={handleSignOut}
            variant="outline"
            size="sm"
            className="glass border-white/10"
          >
            <LogOut className="size-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-8">
        <section className="mb-12 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="glass mx-auto mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-muted-foreground"
          >
            <span className={`size-2 animate-pulse rounded-full ${isBackendConfigured() ? "bg-[var(--neon-blue)]" : "bg-[var(--neon-pink)]"}`} />
            {isBackendConfigured() ? "Built-in Download Engine" : "Demo Mode"}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-balance text-5xl font-black leading-[1.05] tracking-tight md:text-7xl"
          >
            <span className="text-gradient-neon neon-text">Download YouTube</span>
            <br />
            <span className="text-foreground">Videos Instantly</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg"
          >
            Fast, High Quality, MP3 &amp; MP4 Downloads — wrapped in a glassmorphic neon UI.
          </motion.p>
        </section>

        <DownloaderCard onComplete={addRecent} />

        <RecentDownloads items={recent} />

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground"
        >
          Downloads are generated by a background conversion provider. Only download content you own
          or have permission to save.
        </motion.p>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-6 text-center text-xs text-muted-foreground">
        <span className="text-gradient-neon font-semibold">MadWork</span> · Crafted with neon &amp; glass
      </footer>
    </div>
  );
}
