import { carouselGuide } from "@/lib/spec/guide";
import { HOSTED_MCP_URL, SITE_URL } from "@/lib/site";

export const dynamic = "force-static";

/** llms.txt: a plain-text briefing for AI agents and crawlers. */
export function GET() {
  const body = `# Slyd

> Slyd is a free, open source carousel maker for Instagram, LinkedIn and X. People design in the browser; AI agents can create carousels through MCP or a link.

- App: ${SITE_URL}
- MCP server (Streamable HTTP, no auth): ${HOSTED_MCP_URL}
- Agent setup: ${SITE_URL}/agents
- Carousel Spec JSON Schema: ${SITE_URL}/carousel.schema.json

${carouselGuide()}`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
