"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Copy, FileUp, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { ScaledSlide } from "@/components/slide/SlideRenderer";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button, buttonClass } from "@/components/ui/Button";
import { Toaster, toast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import { InstallButton, InstallCard } from "@/components/ui/InstallApp";
import { ASPECTS } from "@/lib/model/constants";
import { TEMPLATES, projectFromTemplate } from "@/lib/model/templates";
import { uid } from "@/lib/model/factory";
import { deleteProject, getPref, importProjectFile, listProjects, saveProject } from "@/lib/storage";
import type { AspectId, Project } from "@/lib/model/types";
import { useEditor } from "@/store/editor";
import { AUTHOR, tracked } from "@/lib/site";
import { StarButton } from "@/components/ui/StarButton";

function timeAgo(t: number) {
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d ago` : new Date(t).toLocaleDateString();
}

export function Dashboard() {
  const router = useRouter();
  const params = useSearchParams();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [aspect, setAspect] = useState<AspectId>("4:5");
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  // Open the card menu upwards when there isn't room for it below the button.
  const [menuUp, setMenuUp] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => (e.type === "scroll" || (e as KeyboardEvent).key === "Escape") && setMenu(null);
    window.addEventListener("keydown", close);
    window.addEventListener("scroll", close, { passive: true });
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close);
    };
  }, [menu]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // The editor may still be flushing its last autosave; prefer its in-memory copy.
    listProjects().then((ps) => {
      const live = useEditor.getState().project;
      setProjects(live ? ps.map((p) => (p.id === live.id ? live : p)) : ps);
    });
  }, []);

  const create = async (templateId: string) => {
    const t = TEMPLATES.find((x) => x.id === templateId) ?? TEMPLATES[0];
    const p = projectFromTemplate(t, aspect);
    p.brand = await getPref("brand", p.brand);
    // A blank carousel starts in the user's own starred theme, if they saved one.
    if (t.id === "blank") p.theme = await getPref("myTheme", p.theme);
    await saveProject(p);
    router.push(`/app/edit?id=${p.id}`);
  };

  // Deep link from the landing page: /app?template=noir. Guarded so React's
  // dev double-effects (and back-button revisits) never create duplicates.
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const t = params.get("template");
    if (!t || handled.current === t) return;
    handled.current = t;
    router.replace("/app");
    create(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const duplicate = async (p: Project) => {
    const c: Project = { ...structuredClone(p), id: uid(), name: `${p.name} (copy)`, createdAt: Date.now(), updatedAt: Date.now() };
    await saveProject(c);
    setProjects((ps) => [c, ...(ps ?? [])]);
    toast.ok("Duplicated");
  };

  // Delete instantly, offer Undo. Faster than a confirm dialog and just as safe.
  const remove = async (p: Project) => {
    await deleteProject(p.id);
    setProjects((ps) => (ps ?? []).filter((x) => x.id !== p.id));
    toast.info(`Deleted "${p.name}"`, {
      label: "Undo",
      run: async () => {
        await saveProject(p);
        setProjects((ps) => [p, ...(ps ?? [])].sort((a, b) => b.updatedAt - a.updatedAt));
      },
    });
  };

  const onImport = async (f: File) => {
    try {
      // A Carousel Spec (what agents write) opens through the same path as a link.
      const raw = JSON.parse(await f.text());
      if (Array.isArray(raw?.slides) && raw.slides[0]?.layout && !raw.theme) {
        const json = new TextEncoder().encode(JSON.stringify(raw));
        let bin = "";
        json.forEach((b) => (bin += String.fromCharCode(b)));
        router.push(`/app/new#j=${btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`);
        return;
      }
      const p = await importProjectFile(f);
      p.id = uid();
      p.updatedAt = Date.now();
      await saveProject(p);
      router.push(`/app/edit?id=${p.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const previews = useMemo(() => TEMPLATES.map((t) => ({ t, p: projectFromTemplate(t, aspect) })), [aspect]);
  const filtered = (projects ?? []).filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen" onClick={() => setMenu(null)}>
      <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-8">
          <Logo size="md" />
          <div className="flex-1" />
          <div className="relative w-72">
            <Search size={15} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search your carousels"
              className="h-9 w-full rounded-xl bg-panel pr-3 pl-9 text-[13.5px] shadow-sm outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <InstallButton />
          <StarButton />
          <Link href="/agents" prefetch={false} className={buttonClass("ghost", "sm")}>
            <Bot size={15} /> AI agents
          </Link>
          <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}>
            <FileUp size={15} /> Import
          </Button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-12">
        <section>
          <div className="mb-6 flex items-end justify-between gap-6">
            <div>
              <h1 className="text-[34px] font-semibold tracking-[-0.03em]">
                Start something <span className="font-serif font-normal italic text-accent">new</span>
              </h1>
              <p className="mt-1 text-[14.5px] text-muted">Pick a template. You can change everything later.</p>
            </div>
            <div className="flex rounded-xl bg-panel p-1 shadow-sm">
              {(Object.keys(ASPECTS) as AspectId[]).map((a) => (
                <button
                  key={a}
                  onClick={() => setAspect(a)}
                  className={cn("relative rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors", aspect === a ? "text-bg" : "text-ink-2 hover:text-ink")}
                  title={ASPECTS[a].hint}
                >
                  {aspect === a && <motion.span layoutId="dash-aspect" className="absolute inset-0 rounded-lg bg-ink" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
                  <span className="relative">
                    {ASPECTS[a].label} <span className="opacity-60">{a}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="no-scrollbar -mx-8 flex gap-5 overflow-x-auto px-8 pt-2 pb-6">
            {previews.map(({ t, p }, i) => {
              return (
                <motion.button
                  key={t.id + aspect}
                  onClick={() => create(t.id)}
                  initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ delay: i * 0.04, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="group shrink-0 text-left"
                >
                  <div className="relative overflow-hidden rounded-2xl shadow-[0_24px_50px_-28px_rgb(0_0_0/.5),0_0_0_1px_var(--line)] transition-all duration-500 ease-out-expo group-hover:-translate-y-1.5 group-hover:shadow-[0_34px_60px_-28px_rgb(0_0_0/.55),0_0_0_2px_var(--accent)]">
                    <ScaledSlide width={180} slide={p.slides[0]} doc={p} index={0} total={p.slides.length} />
                    <div className="absolute inset-0 grid place-items-center bg-black/0 transition-colors duration-300 group-hover:bg-black/25">
                      <span className="flex translate-y-2 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-semibold text-black opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                        <Plus size={13} /> Use
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 text-[13.5px] font-medium">{t.name}</div>
                  <div className="text-[12px] text-muted">{t.sequence.length} slides</div>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold tracking-tight">
              Your carousels {projects && <span className="ml-1 text-muted">{projects.length}</span>}
            </h2>
            <button onClick={() => create("blank")} className={buttonClass("ink", "sm")}>
              <Plus size={14} /> Blank carousel
            </button>
          </div>

          {projects === null ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton aspect-4/5 rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="grid place-items-center rounded-3xl border border-dashed border-line-2 py-20 text-center">
              <div className="font-serif text-[40px] italic">{q ? "Nothing matches" : "A blank shelf"}</div>
              <p className="mt-2 max-w-sm text-[14px] text-muted">{q ? "Try a different search." : "Your carousels will show up here. Pick a template above to make your first one."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-x-6 gap-y-8">
              <AnimatePresence>
                {filtered.map((p) => (
                  <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }} className="group relative">
                    <Link href={`/app/edit?id=${p.id}`} className="block">
                      <div className="relative">
                        {p.slides[1] && (
                          <div className="absolute inset-0 translate-x-2 -translate-y-1 rotate-[4deg] overflow-hidden rounded-2xl opacity-60 transition-transform duration-500 group-hover:translate-x-5 group-hover:rotate-[8deg]">
                            <ScaledSlide width={220} slide={p.slides[1]} doc={p} index={1} total={p.slides.length} />
                          </div>
                        )}
                        <div className="relative overflow-hidden rounded-2xl shadow-[0_20px_40px_-24px_rgb(0_0_0/.5),0_0_0_1px_var(--line)] transition-transform duration-500 group-hover:-rotate-1">
                          <ScaledSlide width={220} slide={p.slides[0]} doc={p} index={0} total={p.slides.length} />
                        </div>
                      </div>
                    </Link>
                    <div className="mt-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-medium">{p.name}</div>
                        <div className="text-[12px] text-muted">
                          {p.slides.length} {p.slides.length === 1 ? "slide" : "slides"} · {p.aspect} · {timeAgo(p.updatedAt)}
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuUp(window.innerHeight - e.currentTarget.getBoundingClientRect().bottom < 110);
                            setMenu(menu === p.id ? null : p.id);
                          }}
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-line hover:text-ink"
                          aria-label="More"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        <AnimatePresence>
                          {menu === p.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: menuUp ? 4 : -4 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={cn(
                                "absolute right-0 z-20 w-40 rounded-xl bg-panel p-1 shadow-lg ring-1 ring-line",
                                menuUp ? "bottom-full mb-1 origin-bottom-right" : "top-full mt-1 origin-top-right",
                              )}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button onClick={() => (duplicate(p), setMenu(null))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-line">
                                <Copy size={14} /> Duplicate
                              </button>
                              <button onClick={() => (remove(p), setMenu(null))} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] text-red-500 hover:bg-red-500/10">
                                <Trash2 size={14} /> Delete
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
        <footer className="mt-20 flex items-center justify-between border-t border-line pt-6 text-[12.5px] text-muted">
          <span>Projects are saved in this browser. Export a .slyd.json file to back one up.</span>
          <a href={tracked(AUTHOR.url, "dashboard")} target="_blank" rel="author noopener" className="hover:text-accent">
            Slyd by <span className="text-ink-2">{AUTHOR.name}</span>
          </a>
        </footer>
      </main>
      <Toaster />
      <InstallCard />
    </div>
  );
}
