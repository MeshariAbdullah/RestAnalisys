import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-neutral-300 mb-4">404</h1>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
          Page not found
        </h2>
        <p className="text-neutral-500 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <a className="inline-block px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors">
            Go home
          </a>
        </Link>
      </div>
    </div>
  );
}
