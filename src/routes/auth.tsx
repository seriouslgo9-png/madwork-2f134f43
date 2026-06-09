import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { Loader2, Mail, Lock, Youtube, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ParticleBackground } from "@/components/ParticleBackground";
import { FloatingPosters } from "@/components/FloatingPosters";
import { playWelcome } from "@/lib/welcome-sound";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in · MS Tube" },
      { name: "description", content: "Sign in or create an account to use MS Tube Downloader." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  // If already signed in, bounce to home
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/" });
    });
  }, [navigate]);

  const afterSuccess = (displayName?: string) => {
    playWelcome(displayName);
    toast.success("Welcome to the MS World ⚡");
    setTimeout(() => navigate({ to: "/" }), 600);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.info("Check your email to confirm your account.");
          setBusy(false);
          return;
        }
        afterSuccess(name || email.split("@")[0]);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        afterSuccess();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };


  return (
    <div className="relative min-h-screen animated-bg">
      <ParticleBackground />
      <FloatingPosters />
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

      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col items-center gap-3"
        >
          <div className="gradient-neon flex size-14 items-center justify-center rounded-2xl neon-glow-purple">
            <Youtube className="size-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black text-gradient-neon neon-text">MS Tube</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {mode === "signup" ? "Create your account" : "Sign in to continue"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass w-full rounded-2xl p-6"
        >
          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Madhav"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="h-11 w-full gradient-neon text-primary-foreground neon-glow-purple hover:opacity-90"
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="size-4" />
                  {mode === "signup" ? "Create account" : "Sign in"}
                </>
              )}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account? " : "New here? "}
            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="font-semibold text-gradient-neon hover:underline"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </motion.div>

        <Link
          to="/"
          className="mt-6 text-xs uppercase tracking-[0.3em] text-muted-foreground hover:text-foreground"
        >
          ← Back
        </Link>
      </main>
    </div>
  );
}
