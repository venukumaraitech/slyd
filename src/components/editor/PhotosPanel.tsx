"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, KeyRound, Loader2, Search, Wallpaper, X } from "lucide-react";
import { PROVIDERS, defaultProvider, getKeys, getProvider, setKey, type ProviderId, type StockPhoto } from "@/lib/stock";
import { cn } from "@/components/ui/cn";
import { toast } from "@/components/ui/Toast";
import { useEditor } from "@/store/editor";
import { DND_MIME, insertImage, replaceImage, setBackgroundImage, type ImagePayload } from "./insert";

const SUGGESTIONS = ["minimal", "workspace", "texture", "nature", "city night", "abstract", "coffee", "portrait", "architecture", "ocean"];

export function PhotosPanel() {
  const [provider, setProvider] = useState<ProviderId>("openverse");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");
  const [orientation, setOrientation] = useState<"portrait" | "landscape" | "squarish" | undefined>(undefined);
  const [photos, setPhotos] = useState<StockPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keys, setKeysState] = useState<Partial<Record<ProviderId, string>>>({});
  const [keyDraft, setKeyDraft] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);
  const reqId = useRef(0);

  useEffect(() => {
    setKeysState(getKeys());
    setProvider(defaultProvider());
  }, []);

  const meta = getProvider(provider);
  const needsKey = meta.needsKey && !keys[provider];

  const load = useCallback(
    async (p: number, reset: boolean) => {
      if (needsKey) return;
      const id = ++reqId.current;
      setLoading(true);
      setError(null);
      try {
        const r = await meta.search(query, p, { orientation, key: keys[provider] });
        if (id !== reqId.current) return;
        setPhotos((prev) => (reset ? r.photos : [...prev, ...r.photos.filter((x) => !prev.some((y) => y.id === x.id))]));
        setHasMore(r.hasMore);
        setPage(p);
      } catch (e) {
        if (id !== reqId.current) return;
        const m = (e as Error).message;
        setError(m === "BAD_KEY" ? "That API key was rejected." : "Couldn't reach the photo service. Check your connection.");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    },
    [meta, query, orientation, keys, provider, needsKey],
  );

  useEffect(() => {
    setPhotos([]);
    load(1, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, query, orientation, keys]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && hasMore && !loading && load(page + 1, false), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, page, load]);

  const toPayload = (p: StockPhoto): ImagePayload => ({ src: p.full, w: p.w, h: p.h, credit: p.credit });

  const use = (p: StockPhoto, mode: "insert" | "bg") => {
    p.track?.();
    const st = useEditor.getState();
    const slide = st.project!.slides.find((s) => s.id === st.activeSlideId)!;
    const sel = slide.elements.find((e) => st.selectedIds.length === 1 && e.id === st.selectedIds[0]);
    if (mode === "bg") {
      setBackgroundImage(toPayload(p));
      toast.ok("Set as background");
    } else if (sel?.type === "image") {
      replaceImage(sel.id, toPayload(p));
      toast.ok("Photo replaced");
    } else insertImage(toPayload(p));
  };

  // Simple two-column masonry
  const cols: StockPhoto[][] = [[], []];
  const heights = [0, 0];
  photos.forEach((p) => {
    const i = heights[0] <= heights[1] ? 0 : 1;
    cols[i].push(p);
    heights[i] += p.h / p.w;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2.5 px-4 pt-1 pb-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQuery(q.trim());
          }}
          className="relative"
        >
          <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder={meta.searchable ? `Search ${meta.name}` : "Picsum is a curated feed"}
            disabled={!meta.searchable}
            className="h-10 w-full rounded-xl bg-panel-2 pr-9 pl-9 text-[13.5px] outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/40 disabled:opacity-60"
          />
          {q && (
            <button type="button" onClick={() => (setQ(""), setQuery(""))} className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted hover:text-ink">
              <X size={14} />
            </button>
          )}
        </form>
        {/* Sources as roomy pills that wrap, so every one is easy to hit. */}
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Photo source">
          {PROVIDERS.map((p) => {
            const on = provider === p.id;
            const locked = p.needsKey && !keys[p.id];
            return (
              <button
                key={p.id}
                role="tab"
                aria-selected={on}
                onClick={() => setProvider(p.id)}
                title={locked ? `${p.name} needs a free API key` : p.name}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors",
                  on ? "bg-ink text-bg" : "bg-panel-2 text-ink-2 hover:bg-line hover:text-ink",
                )}
              >
                {p.name}
                {locked && <KeyRound size={11} className="opacity-60" />}
              </button>
            );
          })}
        </div>
        {meta.searchable && (
          <div className="flex items-center gap-1">
            {([undefined, "portrait", "landscape", "squarish"] as const).map((o) => (
              <button
                key={o ?? "any"}
                onClick={() => setOrientation(o)}
                className={cn("h-7 rounded-lg px-2.5 text-[12px] capitalize transition-colors", orientation === o ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-line hover:text-ink")}
              >
                {o === "squarish" ? "Square" : o ?? "Any"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-6">
        {needsKey ? (
          <div className="rounded-2xl bg-panel-2 p-4">
            <KeyRound size={18} className="text-accent" />
            <h4 className="mt-2 text-[14px] font-semibold">Connect {meta.name}</h4>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Paste a free API key from{" "}
              <a href={meta.keyUrl} target="_blank" rel="noreferrer" className="text-ink underline underline-offset-2">
                {meta.name}
              </a>
              . It stays in this browser and is only sent to {meta.name}. Openverse works without a key.
            </p>
            <form
              className="mt-3 flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!keyDraft.trim()) return;
                setKey(provider, keyDraft);
                setKeysState(getKeys());
                setKeyDraft("");
                toast.ok(`${meta.name} connected`);
              }}
            >
              <input
                value={keyDraft}
                onChange={(e) => setKeyDraft(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Access key"
                className="h-9 min-w-0 flex-1 rounded-lg bg-panel px-2.5 font-mono text-[12px] outline-none focus:ring-2 focus:ring-accent/40"
              />
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-bg">
                <ArrowRight size={15} />
              </button>
            </form>
          </div>
        ) : (
          <>
            {!query && meta.searchable && (
              <div className="mb-3 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => (setQ(s), setQuery(s))} className="rounded-full bg-panel-2 px-2.5 py-1 text-[11.5px] text-ink-2 hover:bg-line">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {error && <div className="mb-3 rounded-xl bg-red-500/10 p-3 text-[12.5px] text-red-500">{error}</div>}
            <div className="flex gap-2">
              {cols.map((c, ci) => (
                <div key={ci} className="flex flex-1 flex-col gap-2">
                  {c.map((p) => (
                    <PhotoTile key={p.id} p={p} onUse={use} />
                  ))}
                </div>
              ))}
            </div>
            {loading && (
              <div className="mt-2 flex gap-2">
                {[0, 1].map((i) => (
                  <div key={i} className="flex flex-1 flex-col gap-2">
                    {[0, 1, 2].map((j) => (
                      <div key={j} className="skeleton rounded-xl" style={{ height: 90 + ((i + j) % 3) * 40 }} />
                    ))}
                  </div>
                ))}
              </div>
            )}
            {!loading && !error && photos.length === 0 && <p className="py-10 text-center text-[13px] text-muted">No photos found. Try another word.</p>}
            <div ref={sentinel} className="h-4" />
          </>
        )}
      </div>
    </div>
  );
}

function PhotoTile({ p, onUse }: { p: StockPhoto; onUse: (p: StockPhoto, mode: "insert" | "bg") => void }) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className="group relative cursor-grab overflow-hidden rounded-xl active:cursor-grabbing"
      style={{ aspectRatio: `${p.w} / ${p.h}`, background: p.color ?? "var(--line)" }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_MIME, JSON.stringify({ src: p.full, w: p.w, h: p.h, credit: p.credit }));
        e.dataTransfer.effectAllowed = "copy";
        p.track?.();
      }}
      onClick={() => onUse(p, "insert")}
      title={`${p.alt || "Photo"} — ${p.credit.author}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.thumb}
        alt={p.alt}
        loading="lazy"
        draggable={false}
        onLoad={() => setLoaded(true)}
        className={cn("h-full w-full object-cover transition-all duration-700 group-hover:scale-105", loaded ? "opacity-100 blur-0" : "opacity-0 blur-md")}
      />
      <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-black/70 via-transparent to-transparent p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUse(p, "bg");
          }}
          className="self-end rounded-md bg-white/90 p-1 text-black backdrop-blur hover:bg-white"
          title="Use as slide background"
        >
          <Wallpaper size={13} />
        </button>
        <span className="truncate text-[10.5px] text-white/90">{p.credit.author}</span>
      </div>
    </div>
  );
}
