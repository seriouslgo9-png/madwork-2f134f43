import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { toast, Toaster } from "sonner";
import { Loader2, Mail, Lock, Youtube, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ParticleBackground } from "@/components/ParticleBackground";
import { Lightning } from "@/components/Lightning";
import { playWelcome } from "@/lib/welcome-sound";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · NeonTube" },
      { name: "description", content: "Sign in or create an account to use NeonTube Downloader." },
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

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    afterSuccess();
  };

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

      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-col items-center gap-3"
        >
          <div className="gradient-neon flex size-14 items-center justify-center rounded-2xl neon-glow-purple">
            <Youtube className="size-7 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black text-gradient-neon neon-text">NeonTube</h1>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {mode === "signup" ? "Create your account" : "Sign in to continue"}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass w-full rounded-2xl p-6"
        >
          <Button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="mb-4 h-11 w-full bg-white text-black hover:bg-white/90"
          >
            <svg className="size-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.11A6.6 6.6 0 0 1 5.48 12c0-.73.13-1.45.36-2.11V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <div className="h-px flex-1 bg-white/10" /> or email <div className="h-px flex-1 bg-white/10" />
          </div>

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
