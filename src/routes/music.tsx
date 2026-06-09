import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast, Toaster } from "sonner";
import {
  Loader2,
  Music,
  Pause,
  Play,
  Plus,
  Trash2,
  Download,
  WifiOff,
  ListMusic,
  Search,
  ArrowLeft,
  Clipboard,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParticleBackground } from "@/components/ParticleBackground";
import { fetchVideoInfo, formatDuration } from "@/lib/download-api";
import {
  getOfflineBlob,
  getOfflineMeta,
  listOffline,
  removeOffline,
  saveOffline,
  type OfflineMeta,
} from "@/lib/offline-cache";

export const Route = createFileRoute("/music")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "MS Tube Music Player — Playlists & Offline" },
      {
        name: "description",
        content:
          "Paste a YouTube link to play music in MS Tube, save songs to playlists, and download for offline listening.",
      },
    ],
  }),
  component: MusicPage,
});

type Track = {
  id: string;
  youtube_id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration_sec: number;
  source_url: string;
};

type Playlist = { id: string; name: string };

const extractId = (url: string): string | null => {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  );
  return m?.[1] ?? null;
};

function MusicPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [current, setCurrent] = useState<Track | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [savingOffline, setSavingOffline] = useState(false);
  const [isOfflineSource, setIsOfflineSource] = useState(false);

  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [offlineMetas, setOfflineMetas] = useState<OfflineMeta[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  // Auth gate
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth" });
        return;
      }
      setUserId(data.user.id);
      setLoading(false);
    });
  }, [navigate]);

  // Load playlists + offline
  useEffect(() => {
    if (!userId) return;
    void refreshPlaylists();
    void refreshOffline();
  }, [userId]);

  // Load tracks when selecting a playlist
  useEffect(() => {
    if (!activePlaylistId) {
      setTracks([]);
      return;
    }
    void loadTracks(activePlaylistId);
  }, [activePlaylistId]);

  const refreshPlaylists = async () => {
    const { data, error } = await supabase
      .from("playlists")
      .select("id,name")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Could not load playlists");
      return;
    }
    setPlaylists(data ?? []);
  };

  const loadTracks = async (pid: string) => {
    const { data, error } = await supabase
      .from("playlist_tracks")
      .select("id,youtube_id,title,thumbnail,channel,duration_sec,source_url")
      .eq("playlist_id", pid)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("Could not load tracks");
      return;
    }
    setTracks((data ?? []) as Track[]);
  };

  const refreshOffline = async () => {
    setOfflineMetas(await listOffline());
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {
      toast.error("Clipboard access denied");
    }
  };

  const playFromUrl = async (rawUrl: string) => {
    const id = extractId(rawUrl);
    if (!id) {
      toast.error("Invalid YouTube URL");
      return;
    }
    setFetching(true);
    setAudioSrc(null);
    setIsOfflineSource(false);
    try {
      // Offline first
      const cached = await getOfflineBlob(id);
      if (cached) {
        const meta = await getOfflineMeta(id);
        const blobUrl = URL.createObjectURL(cached);
        setAudioSrc(blobUrl);
        setIsOfflineSource(true);
        setCurrent({
          id,
          youtube_id: id,
          title: meta?.title ?? "Offline track",
          thumbnail: meta?.thumbnail ?? "",
          channel: meta?.channel ?? "",
          duration_sec: meta?.duration_sec ?? 0,
          source_url: meta?.source_url ?? rawUrl,
        });
        return;
      }

      const info = await fetchVideoInfo(rawUrl);
      setCurrent({
        id: info.id,
        youtube_id: info.id,
        title: info.title,
        thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`,
        channel: info.channel || "YouTube",
        duration_sec: info.duration,
        source_url: rawUrl,
      });
      setStreaming(true);
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: rawUrl, format: "mp3", quality: "best", bitrate: "192" }),
      });
      const data = (await res.json()) as { downloadUrl?: string; error?: string };
      if (!res.ok || !data.downloadUrl) throw new Error(data.error || "Could not stream song");
      setAudioSrc(data.downloadUrl);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not play");
    } finally {
      setFetching(false);
      setStreaming(false);
    }
  };

  const handleDownloadOffline = async () => {
    if (!current || !audioSrc) return;
    setSavingOffline(true);
    try {
      const res = await fetch(audioSrc);
      const blob = await res.blob();
      await saveOffline(current.youtube_id, blob, {
        id: current.youtube_id,
        title: current.title,
        thumbnail: current.thumbnail,
        channel: current.channel,
        duration_sec: current.duration_sec,
        source_url: current.source_url,
      });
      await refreshOffline();
      toast.success("Saved for offline ⚡");
    } catch {
      toast.error("Could not save offline (network/CORS)");
    } finally {
      setSavingOffline(false);
    }
  };

  const handleCreatePlaylist = async (name: string) => {
    if (!name.trim() || !userId) return;
    const { error } = await supabase
      .from("playlists")
      .insert({ name: name.trim(), user_id: userId });
    if (error) {
      toast.error("Could not create playlist");
      return;
    }
    toast.success("Playlist created");
    await refreshPlaylists();
  };

  const handleDeletePlaylist = async (id: string) => {
    await supabase.from("playlists").delete().eq("id", id);
    if (activePlaylistId === id) setActivePlaylistId(null);
    await refreshPlaylists();
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!current || !userId) return;
    const { error } = await supabase.from("playlist_tracks").insert({
      playlist_id: playlistId,
      user_id: userId,
      youtube_id: current.youtube_id,
      title: current.title,
      thumbnail: current.thumbnail,
      channel: current.channel,
      duration_sec: current.duration_sec,
      source_url: current.source_url,
    });
    if (error) {
      toast.error("Could not add to playlist");
      return;
    }
    toast.success("Added to playlist");
    if (playlistId === activePlaylistId) await loadTracks(playlistId);
  };

  const handleRemoveTrack = async (id: string) => {
    await supabase.from("playlist_tracks").delete().eq("id", id);
    if (activePlaylistId) await loadTracks(activePlaylistId);
  };

  const handleRemoveOffline = async (id: string) => {
    await removeOffline(id);
    await refreshOffline();
  };

  const offlineSet = useMemo(
    () => new Set(offlineMetas.map((m) => m.id)),
    [offlineMetas],
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center animated-bg">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen animated-bg">
      <ParticleBackground />
      <Toaster theme="dark" position="top-right" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to downloader
        </Link>
        <div className="flex items-center gap-2">
          <div className="gradient-neon flex size-10 items-center justify-center rounded-xl neon-glow-purple">
            <Music className="size-5 text-primary-foreground" />
          </div>
          <h1 className="font-bold text-gradient-neon">MS Tube · Music</h1>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid max-w-6xl gap-6 px-6 pb-24 lg:grid-cols-[1fr_320px]">
        {/* Player column */}
        <section className="space-y-6">
          {/* Paste link */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-5"
          >
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Paste a YouTube song link
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void playFromUrl(url.trim());
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://youtu.be/..."
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  title="Paste"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                >
                  <Clipboard className="size-4" />
                </button>
              </div>
              <Button
                type="submit"
                disabled={!url || fetching}
                className="gradient-neon text-primary-foreground"
              >
                {fetching ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
                Play
              </Button>
            </form>
          </motion.div>

          {/* Now playing */}
          {current && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass overflow-hidden rounded-2xl p-5 neon-glow-purple"
            >
              <div className="flex flex-col gap-5 sm:flex-row">
                {current.thumbnail && (
                  <img
                    src={current.thumbnail}
                    alt={current.title}
                    className="size-32 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {isOfflineSource ? "Offline" : streaming ? "Loading…" : "Now playing"}
                  </p>
                  <h2 className="mt-1 line-clamp-2 text-xl font-bold">{current.title}</h2>
                  <p className="text-sm text-muted-foreground">{current.channel}</p>
                  {current.duration_sec > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDuration(current.duration_sec)}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <AddToPlaylistButton
                      playlists={playlists}
                      onAdd={handleAddToPlaylist}
                      onCreate={handleCreatePlaylist}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="glass border-white/10"
                      disabled={savingOffline || !audioSrc || offlineSet.has(current.youtube_id)}
                      onClick={handleDownloadOffline}
                    >
                      {offlineSet.has(current.youtube_id) ? (
                        <>
                          <CheckCircle2 className="size-4" /> Saved offline
                        </>
                      ) : savingOffline ? (
                        <>
                          <Loader2 className="size-4 animate-spin" /> Saving
                        </>
                      ) : (
                        <>
                          <Download className="size-4" /> Download (offline)
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {audioSrc && (
                <audio
                  ref={audioRef}
                  src={audioSrc}
                  controls
                  autoPlay
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  className="mt-5 w-full"
                />
              )}
            </motion.div>
          )}

          {/* Playlist tracks */}
          {activePlaylistId && (
            <div className="glass rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Tracks
                </h3>
              </div>
              {tracks.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No tracks yet — play a song and add it here.
                </p>
              ) : (
                <ul className="space-y-2">
                  {tracks.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2"
                    >
                      {t.thumbnail && (
                        <img src={t.thumbnail} alt="" className="size-12 rounded object-cover" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{t.channel}</p>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => void playFromUrl(t.source_url)}
                      >
                        <Play className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleRemoveTrack(t.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Offline library */}
          {offlineMetas.length > 0 && (
            <div className="glass rounded-2xl p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                <WifiOff className="size-4" /> Offline library
              </h3>
              <ul className="space-y-2">
                {offlineMetas.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-2"
                  >
                    {m.thumbnail && (
                      <img src={m.thumbnail} alt="" className="size-12 rounded object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {(m.size / 1024 / 1024).toFixed(1)} MB · {m.channel}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => void playFromUrl(m.source_url)}
                    >
                      <Play className="size-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleRemoveOffline(m.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Playlists sidebar */}
        <aside className="space-y-3">
          <div className="glass rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                <ListMusic className="size-4" /> Playlists
              </h3>
              <CreatePlaylistDialog onCreate={handleCreatePlaylist} />
            </div>
            {playlists.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Create a playlist to save songs.
              </p>
            ) : (
              <ul className="space-y-1">
                {playlists.map((p) => (
                  <li key={p.id} className="flex items-center gap-1">
                    <button
                      onClick={() => setActivePlaylistId(p.id)}
                      className={`flex-1 truncate rounded-lg px-3 py-2 text-left text-sm transition ${
                        activePlaylistId === p.id
                          ? "bg-white/10 text-foreground"
                          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                      }`}
                    >
                      {p.name}
                    </button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeletePlaylist(p.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

function CreatePlaylistDialog({ onCreate }: { onCreate: (name: string) => void | Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <Plus className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New playlist</DialogTitle>
        </DialogHeader>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Bollywood mix"
          autoFocus
        />
        <Button
          onClick={async () => {
            await onCreate(name);
            setName("");
            setOpen(false);
          }}
          className="gradient-neon text-primary-foreground"
        >
          Create
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function AddToPlaylistButton({
  playlists,
  onAdd,
  onCreate,
}: {
  playlists: Playlist[];
  onAdd: (id: string) => void | Promise<void>;
  onCreate: (name: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState<string>("");
  if (playlists.length === 0) {
    return (
      <CreateAndAdd
        onCreate={async (n) => {
          await onCreate(n);
        }}
      />
    );
  }
  return (
    <Select
      value={value}
      onValueChange={async (v) => {
        setValue(v);
        await onAdd(v);
        setValue("");
      }}
    >
      <SelectTrigger className="w-[200px] glass border-white/10">
        <SelectValue placeholder="Add to playlist…" />
      </SelectTrigger>
      <SelectContent>
        {playlists.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function CreateAndAdd({ onCreate }: { onCreate: (name: string) => Promise<void> }) {
  return (
    <CreatePlaylistDialog onCreate={onCreate} />
  );
}
