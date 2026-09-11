"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const MapClient = dynamic(() => import("./MapClient"), {
  ssr: false,
});

export default function MapPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-xl font-bold">
              Civic
              <span className="text-cyan-400">Pulse AI</span>
            </h1>

            <p className="text-xs text-slate-400">
              Live Civic Intelligence Map
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            >
              Dashboard
            </Link>

            <Link
              href="/"
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
            >
              Home
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-7">
          <p className="text-sm font-semibold text-cyan-400">
            LIVE INCIDENT MAP
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            Civic issues across the city
          </h2>

          <p className="mt-2 text-slate-400">
            AI-analyzed complaints are plotted using citizen-reported
            coordinates.
          </p>
        </div>

        <MapClient />
      </section>
    </main>
  );
}