import { createStore, get, set, del, keys } from "idb-keyval";

const store = createStore("ms-tube-offline", "tracks");

export type OfflineMeta = {
  id: string;
  title: string;
  thumbnail?: string;
  channel?: string;
  duration_sec?: number;
  source_url: string;
  cached_at: number;
  size: number;
};

export async function saveOffline(id: string, blob: Blob, meta: Omit<OfflineMeta, "cached_at" | "size">) {
  const full: OfflineMeta = { ...meta, cached_at: Date.now(), size: blob.size };
  await set(`blob:${id}`, blob, store);
  await set(`meta:${id}`, full, store);
}

export async function getOfflineBlob(id: string): Promise<Blob | undefined> {
  return get(`blob:${id}`, store);
}

export async function getOfflineMeta(id: string): Promise<OfflineMeta | undefined> {
  return get(`meta:${id}`, store);
}

export async function removeOffline(id: string) {
  await del(`blob:${id}`, store);
  await del(`meta:${id}`, store);
}

export async function listOffline(): Promise<OfflineMeta[]> {
  const allKeys = await keys(store);
  const metas: OfflineMeta[] = [];
  for (const k of allKeys) {
    if (typeof k === "string" && k.startsWith("meta:")) {
      const m = await get<OfflineMeta>(k, store);
      if (m) metas.push(m);
    }
  }
  return metas.sort((a, b) => b.cached_at - a.cached_at);
}
