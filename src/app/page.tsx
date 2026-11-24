import { SmoothScroll } from "@/components/landing/SmoothScroll";
import { Hero, Nav } from "@/components/landing/Hero";
import { PlatformMarquee, TemplateGallery } from "@/components/landing/Gallery";
import { Bento } from "@/components/landing/Bento";
import { AgentBand, Faq, SelfHost, FinalCta, Footer, HowItWorks, Manifesto, Pricing, Stats, UseCases } from "@/components/landing/Sections";

export default function Landing() {
  return (
    <>
      <SmoothScroll />
      <Nav />
      <main className="overflow-x-clip">
        <Hero />
        <PlatformMarquee />
        <Manifesto />
        <TemplateGallery />
        <Bento />
        <HowItWorks />
        <AgentBand />
        <SelfHost />
        <Stats />
        <UseCases />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
