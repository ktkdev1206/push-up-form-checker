'use client';

import Link from 'next/link';

export function Header(): JSX.Element {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Link
          href="/"
          className="text-xl font-bold text-gray-900 hover:text-green-600 transition-colors"
          aria-label="Go to home page"
        >
          Push-Up Pro
        </Link>
      </div>
    </header>
  );
}

