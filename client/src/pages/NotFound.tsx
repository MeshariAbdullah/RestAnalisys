import React from "react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 p-8">
      <div className="text-center max-w-md">
        <p className="text-7xl font-bold text-amber-500 mb-4">404</p>
        <h1 className="text-2xl font-semibold text-neutral-900 mb-2">Page Not Found</h1>
        <p className="text-neutral-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link href="/">
          <a className="inline-flex items-center px-6 py-3 bg-neutral-950 text-white text-sm font-medium rounded-lg hover:bg-neutral-800 transition-colors">
            Back to Home
          </a>
        </Link>
      </div>
    </div>
  );
}
