import { Link } from "@tanstack/react-router";

export function CardNotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">This card doesn&apos;t exist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link or NFC tag may have been deactivated.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}

export function CardServiceError() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold">Card service unavailable</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t load this card right now. Please try again shortly.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
