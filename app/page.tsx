import Link from "next/link";

const issues = [
  {
    icon: "🚮",
    title: "Garbage",
    description: "Report waste, overflowing bins, and illegal dumping.",
  },
  {
    icon: "🕳️",
    title: "Road Damage",
    description: "Report potholes and damaged public roads.",
  },
  {
    icon: "💧",
    title: "Water & Sewer",
    description: "Report leakage, sewer overflow, and drainage issues.",
  },
  {
    icon: "⚡",
    title: "Electrical Hazard",
    description: "Report exposed wires, damaged poles, and electrical risks.",
  },
];

const steps = [
  {
    number: "01",
    title: "Report",
    description: "Submit an issue using photo, voice, text, and location.",
  },
  {
    number: "02",
    title: "AI Analysis",
    description:
      "AI detects the issue, checks trust, privacy, duplicates, and priority.",
  },
  {
    number: "03",
    title: "Assign & Act",
    description:
      "Agentic AI routes the case to the correct department automatically.",
  },
  {
    number: "04",
    title: "Track & Verify",
    description:
      "The system monitors progress and verifies the final resolution.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold">
              Civic<span className="text-cyan-400">Pulse AI</span>
            </h1>
            <p className="text-xs text-slate-400">
              From Citizen Voice to Government Action
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/track"
              className="rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
            >
              Track Report
            </Link>

            <Link
              href="/report"
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Report Issue
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-300">
            Agentic AI for Smarter Cities
          </div>

          <h2 className="text-5xl font-bold leading-tight lg:text-6xl">
            Report civic problems.
            <span className="block text-cyan-400">
              Let AI take action.
            </span>
          </h2>

          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Report public issues through photo, voice, or text. CivicPulse AI
            analyzes, prioritizes, assigns, tracks, and verifies every issue.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href="/report"
              className="rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Report an Issue →
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl border border-white/15 px-6 py-3 font-semibold hover:bg-white/10"
            >
              Authority Dashboard
            </Link>
          </div>
        </div>

        {/* AI status card */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-7 shadow-2xl">
          <p className="mb-5 text-sm font-medium text-cyan-300">
            AI INCIDENT ANALYSIS
          </p>

          <div className="rounded-2xl bg-slate-900 p-5">
            <div className="mb-4 flex justify-between">
              <span className="text-slate-400">Detected Issue</span>
              <span className="font-semibold">Sewer Overflow</span>
            </div>

            <div className="mb-4 flex justify-between">
              <span className="text-slate-400">AI Priority</span>
              <span className="rounded-full bg-red-500/15 px-3 py-1 text-sm text-red-400">
                Critical
              </span>
            </div>

            <div className="mb-4 flex justify-between">
              <span className="text-slate-400">Trust Score</span>
              <span className="font-semibold text-emerald-400">94%</span>
            </div>

            <div className="mb-4 flex justify-between">
              <span className="text-slate-400">Department</span>
              <span className="font-semibold">Water & Sewerage</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Status</span>
              <span className="font-semibold text-cyan-400">Assigned</span>
            </div>
          </div>
        </div>
      </section>

      {/* Issues */}
      <section className="border-y border-white/10 bg-white/[0.02] py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10">
            <p className="text-sm font-semibold text-cyan-400">
              CIVIC ISSUES
            </p>
            <h3 className="mt-2 text-3xl font-bold">
              What can citizens report?
            </h3>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {issues.map((issue) => (
              <div
                key={issue.title}
                className="rounded-2xl border border-white/10 bg-slate-900 p-6"
              >
                <div className="text-4xl">{issue.icon}</div>
                <h4 className="mt-5 text-xl font-semibold">{issue.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {issue.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <p className="text-sm font-semibold text-cyan-400">HOW IT WORKS</p>
        <h3 className="mt-2 text-3xl font-bold">
          From report to resolution
        </h3>

        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-2xl border border-white/10 p-6"
            >
              <span className="text-sm font-bold text-cyan-400">
                {step.number}
              </span>

              <h4 className="mt-4 text-xl font-semibold">{step.title}</h4>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        CivicPulse AI — Agentic AI for smarter civic action.
      </footer>
    </main>
  );
}