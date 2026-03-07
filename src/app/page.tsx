import { AppShell } from "@/components/atelier/app-shell";
import { HeroSection } from "@/components/atelier/hero-section";
import { SectionHeading } from "@/components/atelier/section-heading";
import { FeatureCard } from "@/components/atelier/feature-card";
import { StatusPill } from "@/components/atelier/status-pill";
import { ActionRow } from "@/components/atelier/action-row";
import { FormField } from "@/components/atelier/form-field";

export default function Page() {
  return (
    <AppShell currentHref="/">
      <HeroSection
        kicker="Invitation to Kaf's atelier"
        title="Crowdsourced translations for Kaf's Minecraft mods"
        subtitle="A focused workshop for contributors and trusted translators. It is not a platform, not a SaaS, and not a general-purpose service."
        primaryCta={{ href: "/api/auth/discord", label: "Sign in with Discord" }}
        secondaryCta={{ href: "/projects", label: "Browse projects" }}
      />

      <section className="mb-14">
        <SectionHeading
          eyebrow="What this atelier does"
          title="Three practical jobs, no platform sprawl"
          description="The workflow stays narrow on purpose: suggest, moderate, export."
        />
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard title="Suggest translations">
            Contributors propose locale strings through a simple flow. Discord login keeps identity
            and accountability clear.
          </FeatureCard>
          <FeatureCard title="Moderate with trusted translators">
            Trusted translators approve or reject suggestions, keeping quality high and history
            traceable.
          </FeatureCard>
          <FeatureCard title="Export approved data">
            Build systems pull approved translations over HTTP. Public and private project rules are
            explicit.
          </FeatureCard>
        </div>
      </section>

      <section className="mb-14">
        <SectionHeading
          eyebrow="Project visibility"
          title="Public and private exports"
          description="The export contract is intentionally simple, with clear access rules."
        />
        <div className="grid md:grid-cols-2 gap-4">
          <FeatureCard title="Public projects">
            <div className="flex items-center gap-2 mb-3">
              <StatusPill variant="public">Public</StatusPill>
              <StatusPill variant="approved">Anonymous export read</StatusPill>
            </div>
            Anyone can read approved exports from public projects without a token.
          </FeatureCard>
          <FeatureCard title="Private projects">
            <div className="flex items-center gap-2 mb-3">
              <StatusPill variant="private">Private</StatusPill>
              <StatusPill variant="trusted">PAT required</StatusPill>
            </div>
            Private exports require `Authorization: Bearer kaf_&lt;token&gt;` using scoped PATs.
          </FeatureCard>
        </div>
      </section>

      <section className="mb-14">
        <SectionHeading eyebrow="How it works" title="A compact workflow for real mod shipping" />
        <div className="grid md:grid-cols-3 gap-4">
          <FeatureCard title="1. Import source catalog">
            Projects and targets are upserted, then source strings are pushed as authoritative
            input.
          </FeatureCard>
          <FeatureCard title="2. Review and moderation">
            Suggestions are reviewed by trusted translators, then accepted or rejected with context.
          </FeatureCard>
          <FeatureCard title="3. Build consumes export">
            CI or release tooling reads approved locale data from the export endpoint.
          </FeatureCard>
        </div>
      </section>

      <section className="mb-14">
        <SectionHeading
          eyebrow="UI direction"
          title="Reusable building blocks"
          description="The site now extends this language into project pages, contributor history, and moderation workbenches."
        />
        <div className="grid md:grid-cols-2 gap-4">
          <FeatureCard title="Status and action language">
            <div className="flex flex-wrap gap-2 mb-4">
              <StatusPill variant="pending">pending</StatusPill>
              <StatusPill variant="approved">approved</StatusPill>
              <StatusPill variant="trusted">trusted</StatusPill>
            </div>
            The same visual language should carry from project browser to moderation queue.
          </FeatureCard>

          <FeatureCard title="Form and validation style">
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <FormField label="Locale" placeholder="fr_fr" hint="Use format xx_xx" />
              <FormField label="Translation" placeholder="Bonjour le monde" hint="Max 500 chars" />
            </div>
            Keep forms concise and informative. Avoid hidden behavior and generic enterprise copy.
          </FeatureCard>
        </div>
      </section>

      <section className="atelier-card p-6 md:p-8 mb-10 bg-gradient-to-br from-[#f2f7ff] to-[#eefdf7] dark:from-[#1a1f35] dark:to-[#182b26]">
        <SectionHeading
          eyebrow="Non-goals"
          title="If it doesn't serve the atelier, it doesn't ship"
          description="No multi-tenant productization, no org-management feature creep, no generic translation-platform ambitions."
        />
        <ActionRow
          primary={{ href: "/api/auth/discord", label: "Enter the atelier" }}
          secondary={{ href: "/api/health", label: "Check health endpoint" }}
        />
      </section>
    </AppShell>
  );
}
