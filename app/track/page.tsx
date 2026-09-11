"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type StepStatus =
  | "Pending"
  | "In Progress"
  | "Completed";

type ActionPlanStep = {
  step: number;
  department: string;
  action: string;
  depends_on: number | null;
  status?: StepStatus;
};

type Complaint = {
  id: string;
  description: string;
  category: string | null;
  priority: string | null;
  trust_score: number | null;
  department: string | null;
  status: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  voice_url: string | null;
  created_at: string;

  is_duplicate: boolean | null;
  duplicate_of: string | null;
  duplicate_confidence: number | null;
  duplicate_reason: string | null;

  requires_coordination: boolean | null;
  involved_departments: string[] | null;
  coordination_reason: string | null;
  action_plan: ActionPlanStep[] | null;

  is_escalated: boolean | null;
  escalation_level: number | null;
  escalation_reason: string | null;
  escalated_at: string | null;

  resolution_image_url: string | null;
  resolution_verification_status: string | null;
  resolution_confidence: number | null;
  resolution_reason: string | null;
  resolution_verified: boolean | null;
  verified_at: string | null;
};

const STATUS_STEPS = [
  "Reported",
  "Assigned",
  "In Progress",
  "Awaiting Verification",
  "Resolved",
];

export default function TrackPage() {
  const [reportId, setReportId] =
    useState("");

  const [complaint, setComplaint] =
    useState<Complaint | null>(
      null
    );

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // =================================
  // TRACK REPORT
  // =================================

  const trackReport = async (
    event: React.FormEvent
  ) => {
    event.preventDefault();

    const id =
      reportId.trim();

    if (!id) {
      setError(
        "Please enter your Report ID."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");
      setComplaint(null);

      const {
        data,
        error: queryError,
      } =
        await supabase
          .from("complaints")
          .select("*")
          .eq("id", id)
          .single();

      if (
        queryError ||
        !data
      ) {
        setError(
          "Report not found. Please check your Report ID and try again."
        );

        return;
      }

      setComplaint(
        data as Complaint
      );
    } catch (err) {
      console.error(
        "Track Error:",
        err
      );

      setError(
        "Unable to load this report."
      );
    } finally {
      setLoading(false);
    }
  };

  // =================================
  // STATUS INDEX
  // =================================

  const getStatusIndex = (
    status: string | null
  ) => {
    const index =
      STATUS_STEPS.indexOf(
        status || ""
      );

    return index >= 0
      ? index
      : 0;
  };

  // =================================
  // PRIORITY STYLE
  // =================================

  const priorityStyle = (
    priority: string | null
  ) => {
    if (
      priority === "Critical"
    ) {
      return "border-red-500/30 bg-red-500/10 text-red-300";
    }

    if (
      priority === "High"
    ) {
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    }

    if (
      priority === "Medium"
    ) {
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    }

    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  };

  // =================================
  // VERIFICATION STYLE
  // =================================

  const verificationStyle = (
    status: string | null
  ) => {
    if (
      status === "Verified" ||
      status ===
        "Manually Verified"
    ) {
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    }

    if (
      status === "Rejected"
    ) {
      return "border-red-500/30 bg-red-500/10 text-red-300";
    }

    if (
      status === "Needs Review"
    ) {
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
    }

    if (
      status === "AI Reviewing"
    ) {
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";
    }

    return "border-white/10 bg-white/5 text-slate-400";
  };

  const currentStatusIndex =
    complaint
      ? getStatusIndex(
          complaint.status
        )
      : 0;

  const actionPlan =
    complaint &&
    Array.isArray(
      complaint.action_plan
    )
      ? complaint.action_plan
      : [];

  const completedSteps =
    actionPlan.filter(
      (step) =>
        step.status ===
        "Completed"
    ).length;

  const actionProgress =
    actionPlan.length > 0
      ? Math.round(
          (completedSteps /
            actionPlan.length) *
            100
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* ================================= */}
      {/* NAVBAR */}
      {/* ================================= */}

      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">

          <Link
            href="/"
            className="text-xl font-bold"
          >
            Civic
            <span className="text-cyan-400">
              Pulse AI
            </span>
          </Link>

          <Link
            href="/report"
            className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950"
          >
            Report Issue
          </Link>

        </div>
      </nav>

      <section className="mx-auto max-w-5xl px-6 py-12">

        {/* ================================= */}
        {/* SEARCH */}
        {/* ================================= */}

        <div className="mx-auto max-w-3xl text-center">

          <p className="text-sm font-semibold text-cyan-400">
            CITIZEN REPORT TRACKING
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Track Your Report
          </h1>

          <p className="mt-3 text-slate-400">
            Enter the Report ID you received after submitting your civic issue.
          </p>

          <form
            onSubmit={
              trackReport
            }
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >

            <input
              type="text"
              value={
                reportId
              }
              onChange={(
                event
              ) =>
                setReportId(
                  event.target.value
                )
              }
              placeholder="Enter Report ID..."
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm outline-none transition focus:border-cyan-400/50"
            />

            <button
              type="submit"
              disabled={
                loading
              }
              className="rounded-xl bg-cyan-400 px-7 py-4 font-bold text-slate-950 disabled:opacity-50"
            >
              {loading
                ? "Tracking..."
                : "Track Report"}
            </button>

          </form>

          {error && (
            <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

        </div>

        {/* ================================= */}
        {/* RESULT */}
        {/* ================================= */}

        {complaint && (
          <div className="mt-12 space-y-6">

            {/* ================================= */}
            {/* HEADER CARD */}
            {/* ================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <div className="flex flex-wrap items-start justify-between gap-4">

                <div>

                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Report Category
                  </p>

                  <h2 className="mt-2 text-2xl font-bold">
                    {complaint.category ||
                      "Civic Issue"}
                  </h2>

                </div>

                <div className="flex flex-wrap gap-2">

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${priorityStyle(
                      complaint.priority
                    )}`}
                  >
                    {complaint.priority ||
                      "Pending"}{" "}
                    Priority
                  </span>

                  {complaint.resolution_verified && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                      ✅ VERIFIED RESOLUTION
                    </span>
                  )}

                </div>

              </div>

              <p className="mt-5 leading-7 text-slate-300">
                {
                  complaint.description
                }
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                <InfoBox
                  title="Current Status"
                  value={
                    complaint.status ||
                    "Reported"
                  }
                />

                <InfoBox
                  title="Department"
                  value={
                    complaint.department ||
                    "Pending Assignment"
                  }
                />

                <InfoBox
                  title="AI Trust Score"
                  value={
                    complaint.trust_score !==
                    null
                      ? `${complaint.trust_score}%`
                      : "Pending"
                  }
                />

                <InfoBox
                  title="Location"
                  value={
                    complaint.location ||
                    "Unknown"
                  }
                />

              </div>

              <p className="mt-5 break-all text-xs text-slate-600">
                Report ID:{" "}
                {complaint.id}
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Submitted:{" "}
                {new Date(
                  complaint.created_at
                ).toLocaleString()}
              </p>

            </div>

            {/* ================================= */}
            {/* MAIN STATUS JOURNEY */}
            {/* ================================= */}

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

              <h3 className="font-bold">
                Report Journey
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Live progress of your civic report.
              </p>

              <div className="mt-7 grid gap-3 md:grid-cols-5">

                {STATUS_STEPS.map(
                  (
                    status,
                    index
                  ) => {

                    const completed =
                      index <=
                      currentStatusIndex;

                    const current =
                      index ===
                      currentStatusIndex;

                    return (
                      <div
                        key={
                          status
                        }
                        className={`rounded-xl border p-4 text-center ${
                          current
                            ? "border-cyan-400/40 bg-cyan-400/10"
                            : completed
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-white/10 bg-slate-950/40"
                        }`}
                      >

                        <div
                          className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                            completed
                              ? "bg-cyan-400 text-slate-950"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {completed
                            ? "✓"
                            : index +
                              1}
                        </div>

                        <p className="mt-3 text-xs font-semibold">
                          {status}
                        </p>

                      </div>
                    );
                  }
                )}

              </div>

            </div>

            {/* ================================= */}
            {/* BEFORE EVIDENCE */}
            {/* ================================= */}

            {complaint.image_url && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Original Citizen Evidence
                </p>

                <h3 className="mt-2 text-lg font-bold">
                  Before / Reported Condition
                </h3>

                <img
                  src={
                    complaint.image_url
                  }
                  alt="Original complaint evidence"
                  className="mt-5 max-h-[500px] w-full rounded-xl object-cover"
                />

              </div>
            )}

            {/* ================================= */}
            {/* DUPLICATE */}
            {/* ================================= */}

            {complaint.is_duplicate && (
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6">

                <p className="font-bold text-purple-300">
                  ⚠ Similar Incident Detected
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-300">
                  CivicPulse AI detected that this report may describe an incident already reported nearby.
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">

                  <InfoBox
                    title="AI Confidence"
                    value={`${complaint.duplicate_confidence || 0}%`}
                  />

                  <InfoBox
                    title="Duplicate Reference"
                    value={
                      complaint.duplicate_of
                        ? complaint.duplicate_of.slice(
                            0,
                            8
                          ) +
                          "..."
                        : "Unavailable"
                    }
                  />

                </div>

                {complaint.duplicate_reason && (
                  <p className="mt-4 text-sm leading-6 text-slate-400">
                    {
                      complaint.duplicate_reason
                    }
                  </p>
                )}

              </div>
            )}

            {/* ================================= */}
            {/* MULTI-DEPARTMENT WORKFLOW */}
            {/* ================================= */}

            {complaint.requires_coordination &&
              actionPlan.length >
                0 && (

              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-6">

                <p className="font-bold text-blue-300">
                  🤖 Multi-Department Response
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  CivicPulse AI coordinated multiple authorities for this incident.
                </p>

                {complaint.coordination_reason && (
                  <div className="mt-5 rounded-xl bg-slate-950/50 p-4">

                    <p className="text-xs uppercase text-slate-500">
                      Why coordination is required
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {
                        complaint.coordination_reason
                      }
                    </p>

                  </div>
                )}

                {Array.isArray(
                  complaint.involved_departments
                ) &&
                  complaint
                    .involved_departments
                    .length >
                    0 && (

                  <div className="mt-5 flex flex-wrap gap-2">

                    {complaint.involved_departments.map(
                      (
                        department,
                        index
                      ) => (
                        <span
                          key={`${department}-${index}`}
                          className="rounded-lg border border-blue-400/20 bg-blue-400/10 px-3 py-2 text-xs text-blue-300"
                        >
                          {
                            department
                          }
                        </span>
                      )
                    )}

                  </div>
                )}

                {/* PROGRESS */}

                <div className="mt-6">

                  <div className="flex justify-between text-sm">

                    <span className="text-slate-400">
                      Department Progress
                    </span>

                    <span className="font-bold text-cyan-400">
                      {actionProgress}%
                    </span>

                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">

                    <div
                      className="h-full bg-cyan-400"
                      style={{
                        width:
                          `${actionProgress}%`,
                      }}
                    />

                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {completedSteps} of{" "}
                    {actionPlan.length} actions completed
                  </p>

                </div>

                {/* STEPS */}

                <div className="mt-6 space-y-3">

                  {actionPlan.map(
                    (
                      step,
                      index
                    ) => {

                      const status =
                        step.status ||
                        "Pending";

                      return (
                        <div
                          key={
                            index
                          }
                          className="rounded-xl border border-white/10 bg-slate-950/50 p-4"
                        >

                          <div className="flex items-start gap-4">

                            <div
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                                status ===
                                "Completed"
                                  ? "bg-emerald-400 text-slate-950"
                                  : status ===
                                    "In Progress"
                                  ? "bg-yellow-300 text-slate-950"
                                  : "bg-slate-800 text-slate-400"
                              }`}
                            >
                              {status ===
                              "Completed"
                                ? "✓"
                                : step.step ||
                                  index +
                                    1}
                            </div>

                            <div className="flex-1">

                              <div className="flex flex-wrap justify-between gap-2">

                                <p className="font-semibold text-cyan-300">
                                  {
                                    step.department
                                  }
                                </p>

                                <span
                                  className={`rounded-full px-3 py-1 text-xs ${
                                    status ===
                                    "Completed"
                                      ? "bg-emerald-500/10 text-emerald-300"
                                      : status ===
                                        "In Progress"
                                      ? "bg-yellow-500/10 text-yellow-300"
                                      : "bg-white/5 text-slate-400"
                                  }`}
                                >
                                  {
                                    status
                                  }
                                </span>

                              </div>

                              <p className="mt-2 text-sm leading-6 text-slate-300">
                                {
                                  step.action
                                }
                              </p>

                            </div>

                          </div>

                        </div>
                      );
                    }
                  )}

                </div>

              </div>
            )}

            {/* ================================= */}
            {/* ESCALATION */}
            {/* ================================= */}

            {complaint.is_escalated && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6">

                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div>

                    <p className="font-bold text-red-300">
                      🚨 Report Escalated
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      SLA monitoring detected a delay in response.
                    </p>

                  </div>

                  <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
                    LEVEL{" "}
                    {complaint.escalation_level ||
                      1}
                  </span>

                </div>

                <div className="mt-5 rounded-xl bg-slate-950/50 p-4">

                  <p className="text-xs uppercase text-slate-500">
                    Escalated To
                  </p>

                  <p className="mt-2 font-semibold">
                    {(complaint.escalation_level ||
                      1) >= 2
                      ? "Senior Authority"
                      : "Department Supervisor"}
                  </p>

                </div>

                {complaint.escalation_reason && (
                  <p className="mt-4 text-sm leading-6 text-slate-300">
                    {
                      complaint.escalation_reason
                    }
                  </p>
                )}

                {complaint.escalated_at && (
                  <p className="mt-4 text-xs text-slate-500">
                    Escalated:{" "}
                    {new Date(
                      complaint.escalated_at
                    ).toLocaleString()}
                  </p>
                )}

              </div>
            )}

            {/* ================================= */}
            {/* RESOLUTION VERIFICATION */}
            {/* ================================= */}

            {(complaint.resolution_image_url ||
              complaint.resolution_verification_status !==
                "Not Submitted") && (

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">

                <div className="flex flex-wrap items-start justify-between gap-3">

                  <div>

                    <p className="font-bold text-emerald-300">
                      📸 Resolution Verification
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Final evidence review
                    </p>

                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${verificationStyle(
                      complaint.resolution_verification_status
                    )}`}
                  >
                    {complaint.resolution_verification_status ||
                      "Not Submitted"}
                  </span>

                </div>

                {complaint.resolution_image_url && (
                  <div className="mt-5">

                    <p className="text-xs uppercase text-slate-500">
                      After / Resolution Evidence
                    </p>

                    <img
                      src={
                        complaint.resolution_image_url
                      }
                      alt="Resolution evidence"
                      className="mt-3 max-h-[500px] w-full rounded-xl object-cover"
                    />

                  </div>
                )}

                <div className="mt-5 grid gap-4 sm:grid-cols-2">

                  <InfoBox
                    title="Verification Method"
                    value={
                      complaint.resolution_verification_status ===
                      "Manually Verified"
                        ? "Human Authority"
                        : complaint.resolution_verified
                        ? "AI Verification"
                        : complaint.resolution_verification_status ||
                          "Pending"
                    }
                  />

                  <InfoBox
                    title="Confidence"
                    value={
                      complaint.resolution_confidence !==
                      null
                        ? `${complaint.resolution_confidence}%`
                        : complaint.resolution_verification_status ===
                          "Manually Verified"
                        ? "Authority Decision"
                        : "Pending"
                    }
                  />

                </div>

                {complaint.resolution_reason && (
                  <div className="mt-4 rounded-xl bg-slate-950/50 p-4">

                    <p className="text-xs uppercase text-slate-500">
                      Verification Result
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {
                        complaint.resolution_reason
                      }
                    </p>

                  </div>
                )}

                {complaint.resolution_verified && (
                  <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">

                    <p className="font-bold text-emerald-300">
                      ✅ Issue Resolution Confirmed
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      This report has completed the CivicPulse resolution workflow.
                    </p>

                  </div>
                )}

                {complaint.verified_at && (
                  <p className="mt-4 text-xs text-slate-500">
                    Verified:{" "}
                    {new Date(
                      complaint.verified_at
                    ).toLocaleString()}
                  </p>
                )}

              </div>
            )}

            {/* ================================= */}
            {/* VOICE */}
            {/* ================================= */}

            {complaint.voice_url && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">

                <p className="text-sm font-semibold">
                  🎙 Citizen Voice Report
                </p>

                <audio
                  controls
                  src={
                    complaint.voice_url
                  }
                  className="mt-4 w-full"
                />

              </div>
            )}

            {/* FINAL */}

            {complaint.status ===
              "Resolved" && (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center">

                <div className="text-4xl">
                  ✅
                </div>

                <h3 className="mt-3 text-2xl font-bold text-emerald-300">
                  Report Resolved
                </h3>

                <p className="mt-2 text-slate-400">
                  Your civic report has completed the resolution workflow.
                </p>

              </div>
            )}

          </div>
        )}

      </section>

    </main>
  );
}

// =================================
// INFO BOX
// =================================

function InfoBox({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">

      <p className="text-xs uppercase tracking-wide text-slate-500">
        {title}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-slate-200">
        {value}
      </p>

    </div>
  );
}