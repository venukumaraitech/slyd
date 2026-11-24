import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TEMPLATES } from "../model/templates";
import { SITE_URL } from "../site";
import { carouselGuide } from "../spec/guide";
import { decodeSpec, specLink } from "../spec/link";
import { nanoid } from "nanoid";
import { CAROUSEL_ID, CarouselSpec, lintSpec } from "../spec/schema";

const INSTRUCTIONS = `Slyd makes designed social-media carousels (Instagram, LinkedIn, X, TikTok) from a JSON spec.

Workflow:
1. If you are unsure about layouts, templates or options, call get_carousel_guide once.
2. Write the carousel: a 'cover' hook first, one idea per slide, a 'cta' last, 5–10 slides. Use *asterisks* to highlight 1–3 key words per slide. Photos can be search words.
3. Call create_carousel. Give the user the link as a markdown link named after the carousel, exactly as returned, e.g. [Open “Sleep tips” in Slyd](https://tryslyd.vercel.app/c/sleep-tips#s=…), rather than pasting the long address. It opens Slyd in their browser, ready to edit and export as PNG/PDF/ZIP.
4. Every carousel has an id (in the create_carousel result). When the user asks for changes to a carousel already made, call update_carousel with that id and the full revised spec. Do not call create_carousel again for edits: update_carousel changes the same carousel in their browser, while create_carousel adds a separate one.
5. To revise a carousel from a link the user pastes, call read_carousel_link, edit the spec, and call update_carousel with its id (or create_carousel if the link has no id).
6. Theming: template, palette, colors (exact hex), accent, fonts, headingFont/bodyFont, highlight, texture and align style the whole carousel; myTheme: true applies the user's own saved Slyd theme.

Nothing is stored on a server: the whole carousel travels inside the link.`;

const pretty = (x: unknown) => JSON.stringify(x, null, 2);

/** `siteUrl` is where this copy of Slyd is reachable, so self-hosted servers hand out links to themselves. */
export function createSlydServer(siteUrl: string = SITE_URL) {
  const server = new McpServer(
    {
      name: "slyd",
      title: "Slyd — Carousel maker",
      version: "1.2.0",
      websiteUrl: siteUrl,
      // Shown by MCP clients (e.g. Claude's connector list) instead of a generic placeholder.
      icons: [
        { src: `${siteUrl}/icon-512.png`, mimeType: "image/png", sizes: ["512x512"] },
        { src: `${siteUrl}/icon-192.png`, mimeType: "image/png", sizes: ["192x192"] },
        { src: `${siteUrl}/icon.svg`, mimeType: "image/svg+xml", sizes: ["any"] },
      ],
    },
    { instructions: INSTRUCTIONS },
  );

  /** Shared by create and update: build the link and a short, readable summary. */
  const respond = async (parsed: CarouselSpec, updated: boolean) => {
    const url = await specLink(parsed, siteUrl);
    const name = (parsed.title ?? (parsed.slides.find((s) => "title" in s && s.title) as { title?: string } | undefined)?.title ?? "your carousel").replace(/\*/g, "");
    const tips = lintSpec(parsed);
    const t = TEMPLATES.find((x) => x.id === (parsed.template ?? "editorial"))!;
    const photos = parsed.slides.filter((s) => ("photo" in s && s.photo) || s.background?.photo || s.elements?.some((e) => e.type === "image")).length;
    const lines = [
      `${updated ? "Carousel updated" : "Carousel ready"}: ${parsed.slides.length} slides · ${t.name} template · ${parsed.format ?? "4:5"} · id ${parsed.id}`,
      "",
      `Open in Slyd: [Open “${name}” in Slyd](${url})`,
      "",
      updated
        ? "Opening this link replaces the earlier version of this carousel in the user's browser (with an Undo), instead of adding a copy."
        : "The link opens the carousel in Slyd, where it can be edited and exported as PNG, PDF or ZIP. The carousel lives in the link itself; nothing is uploaded.",
      `Carousel id ${parsed.id}: update_carousel with this id revises this same carousel.`,
      photos ? `Photos described in words are matched to free stock photos when the link opens (${photos} slide${photos > 1 ? "s" : ""}).` : "",
      tips.length ? `\nOptional suggestions:\n${tips.map((x) => `- ${x}`).join("\n")}` : "",
    ].filter((l) => l !== "");
    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      structuredContent: { id: parsed.id!, url, markdown: `[Open “${name}” in Slyd](${url})`, slides: parsed.slides.length, template: t.id, format: parsed.format ?? "4:5", suggestions: tips },
    };
  };

  server.registerTool(
    "create_carousel",
    {
      title: "Create carousel",
      description:
        "Creates a new designed, editable social-media carousel from a carousel spec and returns a link that opens it in the Slyd editor in the browser, where it can be edited and exported as PNG, PDF or ZIP. " +
        "A spec is a list of slides (layouts: cover, point, list, quote, photo, stat, cta, blank) plus optional styling: template, format, palette, fonts, colours, textures, backgrounds, brand and freeform elements. " +
        "Words wrapped in *asterisks* are highlighted. Photos can be https URLs or search words, which are matched to free stock photos. " +
        "The result includes a carousel id; changes to an existing carousel go through update_carousel with that id. Nothing is stored: the carousel is encoded in the returned link.",
      inputSchema: CarouselSpec.shape,
      annotations: { title: "Create carousel", readOnlyHint: true, idempotentHint: false, openWorldHint: false },
    },
    async (spec) => {
      const parsed = CarouselSpec.parse(spec);
      return respond({ ...parsed, id: parsed.id ?? nanoid(12) }, false);
    },
  );

  const { id: _omit, ...specShape } = CarouselSpec.shape;
  void _omit;
  server.registerTool(
    "update_carousel",
    {
      title: "Update carousel",
      description:
        "Revises an existing Slyd carousel. Takes the carousel id (from create_carousel or read_carousel_link) and the complete revised spec, with the same fields as create_carousel. " +
        "Returns a new link; opening it replaces the earlier version of that carousel in the user's browser instead of adding a second carousel, and the user can undo the change.",
      inputSchema: { id: CAROUSEL_ID.describe("The id of the carousel being revised, as returned by create_carousel or read_carousel_link."), ...specShape },
      annotations: { title: "Update carousel", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async (spec) => respond(CarouselSpec.parse(spec), true),
  );

  server.registerTool(
    "get_carousel_guide",
    {
      title: "Carousel guide",
      description:
        "Returns reference documentation for the carousel spec: every slide layout and its fields, templates, palettes, fonts, textures, backgrounds, icons, freeform element coordinates, writing tips and a complete example.",
      annotations: { title: "Carousel guide", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async () => ({ content: [{ type: "text", text: carouselGuide() }] }),
  );

  server.registerTool(
    "read_carousel_link",
    {
      title: "Read carousel link",
      description:
        "Decodes a Slyd carousel link (…/c/<name>#s=…, …/app/new#s=… or #j=…) and returns the carousel spec it contains, including its carousel id when it has one.",
      inputSchema: { url: z.string().min(10).describe("The Slyd link the user shared.") },
      annotations: { title: "Read carousel link", readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ url }) => {
      try {
        const raw = await decodeSpec(url);
        const parsed = CarouselSpec.safeParse(raw);
        if (!parsed.success) {
          return { isError: true, content: [{ type: "text", text: `The link decoded but isn't a valid carousel:\n${parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n")}` }] };
        }
        return { content: [{ type: "text", text: `Carousel spec (${parsed.data.slides.length} slides):\n\n${pretty(parsed.data)}` }], structuredContent: { spec: parsed.data } };
      } catch {
        return {
          isError: true,
          content: [{ type: "text", text: "That doesn't look like a Slyd carousel link. Links look like https://tryslyd.vercel.app/c/<name>#s=… . Links to saved projects (/app/edit?id=…) only exist in the user's browser and can't be read." }],
        };
      }
    },
  );

  server.registerPrompt(
    "carousel_from_text",
    {
      title: "Turn text into a carousel",
      description: "Turn a post, thread, article or notes into a Slyd carousel.",
      argsSchema: {
        source: z.string().describe("The text to turn into a carousel (post, thread, article, notes)."),
        platform: z.string().optional().describe("Where it will be posted, e.g. LinkedIn or Instagram."),
        style: z.string().optional().describe("Optional look, e.g. 'dark and bold' or 'editorial serif'."),
      },
    },
    ({ source, platform, style }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Turn the text below into a carousel with Slyd${platform ? ` for ${platform}` : ""}${style ? `, styled ${style}` : ""}. ` +
              "Keep my facts and voice. Hook first, one idea per slide, a clear ask at the end, 5–10 slides, highlight key words with *asterisks*. " +
              "Use the create_carousel tool, then give me the link.\n\n---\n" +
              source,
          },
        },
      ],
    }),
  );

  return server;
}
