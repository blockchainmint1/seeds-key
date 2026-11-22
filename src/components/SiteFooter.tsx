import lockup from "@/assets/logo/seeds-lockup-full.png.asset.json";
import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border py-8 text-sm text-muted-foreground">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 text-center">
        <p>
          Part of the{" "}
          <a
            href="https://honest.money"
            className="text-primary underline-offset-4 hover:underline"
          >
            honest.money
          </a>{" "}
          ecosystem
        </p>
        <nav className="flex gap-5">
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/manifesto" className="hover:text-foreground">
            Manifesto
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-xl items-center gap-2 px-6 pt-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Seeds Key home">
          <img src={lockup.url} alt="Seeds" width={1152} height={319} className="h-[34px] w-auto" />
          <span className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
            Key
          </span>
        </Link>
      </header>
      <main className="mx-auto w-full max-w-xl flex-1 px-6 pt-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
