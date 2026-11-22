import { createFileRoute } from "@tanstack/react-router";
import { Page } from "@/components/SiteFooter";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — Seeds Key" },
      { name: "description", content: "Terms for using the Seeds Key sign-in page." },
      { property: "og:title", content: "Terms — Seeds Key" },
      { property: "og:description", content: "Terms for using the Seeds Key sign-in page." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <Page>
      <article className="animate-sprout space-y-4 pb-10 leading-relaxed text-muted-foreground [&_h1]:text-4xl [&_h1]:text-foreground [&_h2]:pt-4 [&_h2]:text-xl [&_h2]:text-foreground">
        <h1>Terms</h1>
        <p>
          Seeds Key is a free tool that helps you open a Seeds Exchange account with a Cold Storage
          Coin or your own wallet. It runs entirely in your browser.
        </p>
        <h2>Your keys, your responsibility</h2>
        <p>
          You stay in control of your recovery phrase and wallet. Seeds Key never receives or stores
          them. Keep your coin and phrase safe; nobody can recover them for you.
        </p>
        <h2>No warranty</h2>
        <p>
          The tool is provided as is. Always check the site name shown before you sign anything, and
          only use this page at key.seeds.honest.money.
        </p>
        <h2>Seeds Exchange</h2>
        <p>Your use of Seeds Exchange itself is covered by its own terms at seeds.honest.money.</p>
      </article>
    </Page>
  ),
});
