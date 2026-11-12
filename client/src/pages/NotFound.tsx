import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 text-white">
      <h1 className="text-8xl font-bold tracking-tight text-amber-500">404</h1>
      <p className="mt-4 text-xl text-neutral-400">Page not found</p>
      <p className="mt-2 text-sm text-neutral-500">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-amber-600 px-6 text-sm font-medium text-white transition-colors hover:bg-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
      >
        Back to home
      </Link>
    </div>
  );
}
