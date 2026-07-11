import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="text-xl font-bold">
            MatchFinder
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/register">
              <Button>Get started</Button>
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <section className="container mx-auto flex flex-col items-center justify-center gap-6 py-24 px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Find your next football match
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            MatchFinder connects organizers with players. Create matches, join
            games, and never miss a kick-about again.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/register">
              <Button size="lg">Create a match</Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="outline">
                Join as a player
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t py-6">
        <div className="container mx-auto text-center text-sm text-muted-foreground px-4">
          MatchFinder
        </div>
      </footer>
    </div>
  );
}
