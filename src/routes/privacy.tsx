import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/SiteFooter";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — Seeds Key" },
      {
        name: "description",
        content: "Seeds Key never sees, sends or stores your recovery phrase.",
      },
      { property: "og:title", content: "Privacy — Seeds Key" },
      {
        property: "og:description",
        content: "Seeds Key never sees, sends or stores your recovery phrase.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <Page>
      <article className="animate-sprout space-y-4 pb-10 leading-relaxed text-muted-foreground [&_h1]:text-4xl [&_h1]:text-foreground [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:text-foreground">
        <p className="text-xs uppercase tracking-widest text-primary">Draft — pending review</p>
        <h1>Privacy</h1>
        <p>
          Your recovery phrase never leaves your device. It is turned into a sign-in signature and
          the sealed keys for one trading pocket, then wiped from memory.
        </p>
        <h2>What is sent</h2>
        <p>
          Only to Seeds: your sign-in address, the signature, the public addresses of your trading
          pocket, and the pocket keys sealed so only Seeds can open them.
        </p>
        <h2>What is not</h2>
        <p>
          No analytics, no cookies, no trackers, no third-party scripts. Camera images used to read
          your coin stay on your device.
        </p>
      </article>
    </Page>
  ),
});
