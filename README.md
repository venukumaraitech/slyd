<div align="center">

<a href="https://tryslyd.vercel.app"><img src="https://tryslyd.vercel.app/og.jpg" alt="Slyd: carousels that stop the scroll" width="100%" /></a>

# Slyd

**Carousels that stop the scroll.**

A free, open source carousel maker for Instagram, LinkedIn and X.<br />
Design in your browser, or let your AI agent build the carousel for you.

[**Run your own (one command)**](#run-your-own-slyd) · [**Try it online**](https://tryslyd.vercel.app) · [**Connect your AI agent**](#create-carousels-with-your-ai-agent)

[![Live](https://img.shields.io/badge/live-tryslyd.vercel.app-FF5A1F?style=flat-square)](https://tryslyd.vercel.app)
[![Docker](https://img.shields.io/badge/docker-ghcr.io%2Fvenukumaraitech%2Fslyd-141311?style=flat-square&logo=docker)](#run-your-own-slyd)
[![MCP](https://img.shields.io/badge/MCP-ready-141311?style=flat-square)](#create-carousels-with-your-ai-agent)
[![License: MIT](https://img.shields.io/badge/license-MIT-141311?style=flat-square)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-141311?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![No sign-up](https://img.shields.io/badge/sign--up-not%20required-141311?style=flat-square)](https://tryslyd.vercel.app/app)

</div>

---

## Why Slyd

Most carousel tools want a subscription, an account and your attention. Slyd just opens. Pick a mood, write your hook, drop in a photo and export. Everything runs in your browser, and your work never leaves your machine.

- **Free, with no tiers or watermarks.** Every feature is available to everyone.
- **Private by design.** No account and no uploads. Projects are saved in your browser.
- **Built for laptops.** Keyboard-first, with a shortcut for every action.
- **Agent-ready.** Claude, ChatGPT, Cursor and VS Code can create carousels for you through MCP.

## Run your own Slyd

Slyd is free and the public site runs on a hobby budget, so **please run your own copy** if you use it regularly. It takes one command, and everything (the editor, your projects and the MCP server for your AI agent) then lives on your machine.

**Docker** (recommended):

```bash
docker run -d -p 3000:3000 --name slyd --restart unless-stopped ghcr.io/venukumaraitech/slyd:latest
```

Open **http://localhost:3000**. Your AI agent's MCP server is at **http://localhost:3000/mcp**.

<details>
<summary><b>Docker Compose, Node.js, or your own server</b></summary>

**Docker Compose:** grab [`docker-compose.yml`](./docker-compose.yml) and run `docker compose up -d`.

**Node.js 20+**, without Docker:

```bash
git clone https://github.com/venukumaraitech/slyd.git && cd slyd
npm install
npm run build && npm start      # http://localhost:3000
```

**On a server behind your own domain**, set `PUBLIC_URL` so the links your agent hands out point there:

```bash
docker run -d -p 3000:3000 -e PUBLIC_URL=https://slyd.example.com ghcr.io/venukumaraitech/slyd:latest
```

The image is built for `linux/amd64` and `linux/arm64` (Apple silicon, Raspberry Pi) on every release.

</details>

Even on the public site, Slyd does its work in your browser: after the first visit the app is cached locally, works offline, and your carousels never leave your machine.

## Features

**Design**
- 9 templates (Editorial, Noir, Swiss, Aurora, Notebook, Photo story, Field guide, Terracotta, Blank), built on live theme tokens, so one palette or font change restyles every slide
- 8 slide layouts: hook, numbered point, list, quote, photo with caption, big number, call to action, blank
- 12 palettes, 10 font pairs and 14 typefaces; film grain, risograph, paper and grid textures; mesh and gradient backgrounds
- Word highlights in five styles: colour, italic, marker, underline, pill. Just wrap words in `*asterisks*`

**Editing**
- Drag, resize and rotate, with snapping guides, box select, layers, locking, and Alt-drag to duplicate
- A quick toolbar on every selection, right-click menus, and drag-to-reposition inside photos
- Unlimited undo, copy and paste, and paste images straight from the clipboard

**Content**
- One search across Unsplash, Pexels, Openverse, Wikimedia Commons and Picsum, with credits saved automatically
- A brand kit (name, handle, avatar, page counter, swipe arrow) added to every slide

**Publishing**
- Formats: square 1:1, portrait 4:5, tall 3:4, story 9:16, wide 16:9
- Phone preview with Instagram and LinkedIn mockups
- Export to PNG, JPG, a LinkedIn-ready PDF, or a ZIP of everything at 1×, 2× or 3×, with fonts embedded

## Create carousels with your AI agent

Slyd includes a [Model Context Protocol](https://modelcontextprotocol.io) server, so Claude, ChatGPT, Cursor and VS Code can make carousels for you. No API key needed.

**Use your own, local MCP server** (after [running your own Slyd](#run-your-own-slyd)):

```
http://localhost:3000/mcp
```

| Client | Connect to your local Slyd |
| --- | --- |
| **Claude Code** | `claude mcp add --transport http slyd http://localhost:3000/mcp` |
| **Claude Desktop** | Add to `claude_desktop_config.json` (Settings → Developer → Edit config), then restart:<br>`{"mcpServers":{"slyd":{"command":"npx","args":["-y","mcp-remote","http://localhost:3000/mcp"]}}}` |
| **Cursor** | `~/.cursor/mcp.json`: `{"mcpServers":{"slyd":{"url":"http://localhost:3000/mcp"}}}` |
| **VS Code** | `.vscode/mcp.json`: `{"servers":{"slyd":{"type":"http","url":"http://localhost:3000/mcp"}}}` |
| **Anything else** | Streamable HTTP at `http://localhost:3000/mcp`, or `npx -y mcp-remote http://localhost:3000/mcp` |

> **claude.ai and ChatGPT on the web** connect from their own cloud, so they can't reach `localhost`. Use Claude Desktop or Claude Code with your local server, put your Slyd on a public URL, or use the shared server below.

**Shared server** (handy for a quick try; please self-host for regular use): `https://tryslyd.vercel.app/mcp`. Add it in Claude or ChatGPT under Settings → Connectors → *Add custom connector*, with no authentication. One-click installs for Cursor and VS Code are on [tryslyd.vercel.app/agents](https://tryslyd.vercel.app/agents).

Then ask for what you want:

> *"Turn my last LinkedIn post into a 7-slide carousel in the Noir style, with my handle @avamakes."*

Your agent writes the carousel, Slyd designs it, and you get a link that opens it in the editor, ready to tweak and export.

| Tool | What it does |
| --- | --- |
| `create_carousel` | Builds a carousel from a spec and returns a link that opens it in Slyd |
| `get_carousel_guide` | Layouts, options and copywriting rules, so the agent gets it right the first time |
| `update_carousel` | Revises a carousel it already made; the new link updates the same carousel in your browser (with Undo) |
| `read_carousel_link` | Turns a Slyd link back into a spec, so the agent can revise it |
| `carousel_from_text` *(prompt)* | Turns any post, thread or notes into a carousel |

Agents can use the whole editor: every template, layout, palette, font, texture and background, your brand kit, photos found from a short description, and freeform text, images, shapes and icons placed anywhere.

**Privacy:** the whole carousel travels inside the link's `#fragment`, which browsers never send to a server. Nothing is stored.

**No MCP?** Any assistant that can read a web page can build a link from [`/llms.txt`](https://tryslyd.vercel.app/llms.txt), using the [JSON Schema](https://tryslyd.vercel.app/carousel.schema.json).

<details>
<summary><b>Example spec</b></summary>

```json
{
  "template": "noir",
  "format": "4:5",
  "brand": { "name": "Ava Reyes", "handle": "@avamakes" },
  "slides": [
    { "layout": "cover", "kicker": "Remote work", "title": "We cut meetings by *70%*. Here's how." },
    { "layout": "point", "title": "Default to *writing*", "body": "Every decision starts as a doc." },
    { "layout": "stat", "value": "70%", "label": "fewer meetings after six months." },
    { "layout": "photo", "photo": "calm minimal home office", "title": "Protect *deep work*" },
    { "layout": "cta", "title": "Useful? *Save it* for later.", "button": "Follow for more →" }
  ]
}
```

</details>

## Develop

Requires Node.js 20 or later.

```bash
npm install
npm run dev          # http://localhost:3000
```

| Variable | Purpose |
| --- | --- |
| `PUBLIC_URL` | The address people reach your Slyd at, for the links the MCP server hands out. Defaults to the address of each request. |
| `NEXT_PUBLIC_SITE_URL` | Build-time public URL for share cards and canonical links |
| `NEXT_PUBLIC_UNSPLASH_ACCESS_KEY` · `NEXT_PUBLIC_PEXELS_API_KEY` | Optional stock photo keys. These end up in the browser, so don't set them on a public deployment. Visitors can add their own keys in Settings. |

Build the Docker image yourself with `docker build -t slyd .`. It also deploys to Vercel with no extra configuration.

## Built with

Next.js 15 · React 19 · TypeScript · Tailwind CSS 4 · Motion · GSAP · WebGL · Zustand · Immer · Zod · MCP SDK · html-to-image · jsPDF

<details>
<summary><b>Architecture</b></summary>

- **One renderer.** `SlideRenderer` draws every slide in the editor, thumbnails, previews, the landing page and the export, so what you see is exactly what you export.
- **Theme tokens.** Colours and fonts are stored as tokens (`$accent`, `$heading`), so restyling a carousel is a single change.
- **Carousel Spec.** A single Zod schema (`src/lib/spec`) drives validation, the MCP tools, the JSON Schema and the agent docs, so they never drift apart.
- **Stateless MCP.** `/mcp` is a pure function of its input. There's no database, no session and nothing to leak.
- **Fast by default.** Images are fetched at their display size, rendering is memoized, and export code loads only when you export.

```
src/
  app/            Routes: landing, dashboard, editor, /agents, /mcp, /llms.txt
  components/     Editor, landing page, slide renderer, UI kit
  lib/model/      Document model, templates, themes, textures
  lib/spec/       Carousel Spec: schema, compiler, links, agent guide
  lib/mcp/        MCP server (tools and prompt)
  lib/stock/      Stock photo providers
  store/          Editor state and undo history
```

</details>

## Roadmap

- [x] Editor, templates, brand kit, stock photos, export
- [x] Hosted MCP server for AI agents
- [ ] In-app AI: paste a post and get a carousel (bring your own key)
- [ ] Custom font upload
- [ ] Grouping and multi-select resize

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to talk through the approach.

## Author

Designed and built by **[Venu Kumar Mutyala](https://venukumar.vercel.app/?utm_source=slyd&utm_medium=referral&utm_campaign=credit&utm_content=readme)**, Gen AI Engineer.

[Portfolio](https://venukumar.vercel.app/?utm_source=slyd&utm_medium=referral&utm_campaign=credit&utm_content=readme-links) · [LinkedIn](https://www.linkedin.com/in/venukumarmd) · [GitHub](https://github.com/mdvenukumar) · [GitLab](https://gitlab.com/venukumar.ai) · [Instagram](https://www.instagram.com/itsvenukumar)

If you build on Slyd, please keep the author credit.

## License

[MIT](./LICENSE) © 2026 Venu Kumar Mutyala. Stock photos belong to their creators and are used under their providers' licenses; Slyd records attribution for every photo you use.
