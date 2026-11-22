import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/SiteFooter";

export const Route = createFileRoute("/manifesto")({
  head: () => ({
    meta: [
      { title: "Manifesto — Seeds Key" },
      {
        name: "description",
        content: "Why the Honest Money Ecosystem builds tools like Seeds Key.",
      },
      { property: "og:title", content: "Manifesto — Seeds Key" },
      {
        property: "og:description",
        content: "Why the Honest Money Ecosystem builds tools like Seeds Key.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <Page>
      <article className="animate-sprout space-y-4 pb-10 leading-relaxed text-muted-foreground [&_h1]:text-4xl [&_h1]:text-foreground [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:text-foreground">
        <p className="text-xs uppercase tracking-widest text-primary">Draft — pending review</p>
        <h1>Manifesto</h1>
        <p>
          Money should be honest: owned by the people who hold it, verifiable by anyone, and never
          quietly taken.
        </p>
        <p>
          The Honest Money Ecosystem — TEXITcoin (TXC), ISK and ZeroChill (ZCU) — exists to give
          people sound money and the tools to use it without giving up control.
        </p>
        <p>
          Seeds Key follows that rule: you sign in with what you already own. Your phrase stays
          yours. The exchange only gets what it needs, sealed, and nothing more.
        </p>
      </article>
    </Page>
  ),
});
