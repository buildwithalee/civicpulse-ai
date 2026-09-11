"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Complaint = {
  id: string;
  category: string | null;
  priority: string | null;
  department: string | null;
  status: string | null;

  is_duplicate: boolean | null;
  requires_coordination: boolean | null;
  is_escalated: boolean | null;
  resolution_verified: boolean | null;

  created_at: string;
};

type BreakdownItem = {
  name: string;
  count: number;
  percentage: number;
};

export default function AnalyticsPage() {
  const [complaints, setComplaints] =
    useState<Complaint[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);

    const { data, error } =
      await supabase
        .from("complaints")
        .select(`
          id,
          category,
          priority,
          department,
          status,
          is_duplicate,
          requires_coordination,
          is_escalated,
          resolution_verified,
          created_at
        `)
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(
        "Analytics Fetch Error:",
        error
      );

      alert(
        "Failed to load analytics."
      );
    } else {
      setComplaints(
        (data || []) as Complaint[]
      );
    }

    setLoading(false);
  };

  // =================================
  // BASIC METRICS
  // =================================

  const total =
    complaints.length;

  const resolved =
    complaints.filter(
      (item) =>
        item.status === "Resolved"
    ).length;

  const escalated =
    complaints.filter(
      (item) =>
        item.is_escalated === true
    ).length;

  const duplicates =
    complaints.filter(
      (item) =>
        item.is_duplicate === true
    ).length;

  const coordinated =
    complaints.filter(
      (item) =>
        item.requires_coordination ===
        true
    ).length;

  const verified =
    complaints.filter(
      (item) =>
        item.resolution_verified ===
        true
    ).length;

  const critical =
    complaints.filter(
      (item) =>
        item.priority === "Critical"
    ).length;

  const awaitingVerification =
    complaints.filter(
      (item) =>
        item.status ===
        "Awaiting Verification"
    ).length;

  const percentage = (
    value: number
  ) => {
    if (total === 0) {
      return 0;
    }

    return Math.round(
      (value / total) * 100
    );
  };

  const resolutionRate =
    percentage(resolved);

  const escalationRate =
    percentage(escalated);

  const duplicateRate =
    percentage(duplicates);

  const verificationRate =
    percentage(verified);

  // =================================
  // BREAKDOWN HELPER
  // =================================

  const createBreakdown = (
    field:
      | "category"
      | "priority"
      | "department"
      | "status"
  ): BreakdownItem[] => {
    const counts:
      Record<string, number> = {};

    complaints.forEach(
      (complaint) => {
        const value =
          complaint[field] ||
          "Unknown";

        counts[value] =
          (counts[value] || 0) +
          1;
      }
    );

    return Object.entries(counts)
      .map(
        ([name, count]) => ({
          name,

          count,

          percentage:
            total > 0
              ? Math.round(
                  (count / total) *
                    100
                )
              : 0,
        })
      )
      .sort(
        (a, b) =>
          b.count - a.count
      );
  };

  const categoryBreakdown =
    useMemo(
      () =>
        createBreakdown(
          "category"
        ),
      [complaints]
    );

  const priorityBreakdown =
    useMemo(
      () =>
        createBreakdown(
          "priority"
        ),
      [complaints]
    );

  const departmentBreakdown =
    useMemo(
      () =>
        createBreakdown(
          "department"
        ),
      [complaints]
    );

  const statusBreakdown =
    useMemo(
      () =>
        createBreakdown(
          "status"
        ),
      [complaints]
    );

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* NAVBAR */}

      <nav className="border-b border-white/10">

        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5">

          <div>
            <h1 className="text-xl font-bold">
              Civic
              <span className="text-cyan-400">
                Pulse AI
              </span>
            </h1>

            <p className="text-xs text-slate-400">
              Intelligence & Analytics
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={
                loadAnalytics
              }
              className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
            >
              ↻ Refresh
            </button>

            <Link
              href="/dashboard"
              className="rounded-lg border border-cyan-400/30 px-4 py-2 text-sm text-cyan-400"
            >
              Dashboard
            </Link>

            <Link
              href="/"
              className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950"
            >
              Home
            </Link>

          </div>

        </div>

      </nav>

      <section className="mx-auto max-w-7xl px-6 py-10">

        {/* HEADER */}

        <div>

          <p className="text-sm font-semibold text-cyan-400">
            CIVIC INTELLIGENCE
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            System Analytics
          </h2>

          <p className="mt-2 max-w-3xl text-slate-400">
            Real-time operational insights from citizen reports,
            AI agents and authority workflows.
          </p>

        </div>

        {loading ? (

          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center text-slate-400">
            Loading analytics...
          </div>

        ) : (

          <>
            {/* ================================= */}
            {/* TOP STATS */}
            {/* ================================= */}

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <MetricCard
                title="Total Reports"
                value={`${total}`}
                subtitle="Citizen incidents received"
              />

              <MetricCard
                title="Resolution Rate"
                value={`${resolutionRate}%`}
                subtitle={`${resolved} reports resolved`}
              />

              <MetricCard
                title="AI Verified"
                value={`${verified}`}
                subtitle={`${verificationRate}% of all reports`}
              />

              <MetricCard
                title="Critical Issues"
                value={`${critical}`}
                subtitle="Immediate attention required"
              />

            </div>

            {/* ================================= */}
            {/* AI IMPACT */}
            {/* ================================= */}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

              <MetricCard
                title="Duplicates Detected"
                value={`${duplicates}`}
                subtitle={`${duplicateRate}% duplicate rate`}
              />

              <MetricCard
                title="Multi-Department"
                value={`${coordinated}`}
                subtitle="Agentic coordination cases"
              />

              <MetricCard
                title="Escalations"
                value={`${escalated}`}
                subtitle={`${escalationRate}% escalation rate`}
              />

              <MetricCard
                title="Awaiting Verification"
                value={`${awaitingVerification}`}
                subtitle="Pending final evidence review"
              />

            </div>

            {/* ================================= */}
            {/* PERFORMANCE */}
            {/* ================================= */}

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <div className="mb-6">

                <p className="font-bold">
                  Operational Performance
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Key CivicPulse workflow indicators
                </p>

              </div>

              <div className="space-y-6">

                <ProgressMetric
                  title="Resolution Rate"
                  value={
                    resolutionRate
                  }
                  detail={`${resolved} of ${total} reports resolved`}
                />

                <ProgressMetric
                  title="Resolution Verification"
                  value={
                    verificationRate
                  }
                  detail={`${verified} evidence-based resolutions verified`}
                />

                <ProgressMetric
                  title="Duplicate Detection"
                  value={
                    duplicateRate
                  }
                  detail={`${duplicates} duplicate reports identified`}
                />

                <ProgressMetric
                  title="Escalation Rate"
                  value={
                    escalationRate
                  }
                  detail={`${escalated} delayed cases escalated`}
                />

              </div>

            </div>

            {/* ================================= */}
            {/* CATEGORY + PRIORITY */}
            {/* ================================= */}

            <div className="mt-8 grid gap-6 lg:grid-cols-2">

              <BreakdownCard
                title="Issue Categories"
                subtitle="What citizens are reporting"
                items={
                  categoryBreakdown
                }
              />

              <BreakdownCard
                title="Priority Distribution"
                subtitle="Severity of reported incidents"
                items={
                  priorityBreakdown
                }
              />

            </div>

            {/* ================================= */}
            {/* DEPARTMENTS + STATUS */}
            {/* ================================= */}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">

              <BreakdownCard
                title="Department Workload"
                subtitle="Reports assigned by authority"
                items={
                  departmentBreakdown
                }
              />

              <BreakdownCard
                title="Workflow Status"
                subtitle="Current report lifecycle"
                items={
                  statusBreakdown
                }
              />

            </div>

            {/* ================================= */}
            {/* HACKATHON INSIGHT */}
            {/* ================================= */}

            <div className="mt-8 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-6">

              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
                AI SYSTEM INSIGHT
              </p>

              <h3 className="mt-3 text-xl font-bold">
                From reports to measurable government action
              </h3>

              <p className="mt-3 max-w-4xl leading-7 text-slate-300">
                CivicPulse AI does more than collect complaints.
                It detects repeated incidents, coordinates multiple
                departments, monitors response delays, escalates
                overdue cases and verifies resolution evidence
                before closing the citizen report.
              </p>

            </div>

          </>

        )}

      </section>

    </main>
  );
}

// =================================
// METRIC CARD
// =================================

function MetricCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-cyan-300">
        {value}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        {subtitle}
      </p>

    </div>
  );
}

// =================================
// PROGRESS METRIC
// =================================

function ProgressMetric({
  title,
  value,
  detail,
}: {
  title: string;
  value: number;
  detail: string;
}) {
  return (
    <div>

      <div className="flex items-center justify-between gap-4">

        <div>
          <p className="text-sm font-semibold">
            {title}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {detail}
          </p>
        </div>

        <p className="font-bold text-cyan-300">
          {value}%
        </p>

      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">

        <div
          className="h-full rounded-full bg-cyan-400 transition-all"
          style={{
            width:
              `${Math.min(
                100,
                Math.max(
                  0,
                  value
                )
              )}%`,
          }}
        />

      </div>

    </div>
  );
}

// =================================
// BREAKDOWN CARD
// =================================

function BreakdownCard({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: BreakdownItem[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

      <p className="font-bold">
        {title}
      </p>

      <p className="mt-1 text-sm text-slate-500">
        {subtitle}
      </p>

      {items.length === 0 ? (

        <p className="mt-6 text-sm text-slate-500">
          No data available.
        </p>

      ) : (

        <div className="mt-6 space-y-5">

          {items.map(
            (item) => (

              <div
                key={
                  item.name
                }
              >

                <div className="flex items-center justify-between gap-4">

                  <p className="text-sm font-medium text-slate-300">
                    {item.name}
                  </p>

                  <div className="text-right">

                    <span className="text-sm font-bold text-white">
                      {item.count}
                    </span>

                    <span className="ml-2 text-xs text-slate-500">
                      {item.percentage}%
                    </span>

                  </div>

                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">

                  <div
                    className="h-full rounded-full bg-cyan-400"
                    style={{
                      width:
                        `${item.percentage}%`,
                    }}
                  />

                </div>

              </div>

            )
          )}

        </div>

      )}

    </div>
  );
}