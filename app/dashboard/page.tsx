"use client";

import { useEffect, useState } from "react";
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
  last_escalation_check: string | null;

  resolution_image_url: string | null;
  resolution_verification_status: string | null;
  resolution_confidence: number | null;
  resolution_reason: string | null;
  resolution_verified: boolean | null;
  verified_at: string | null;
};

export default function DashboardPage() {
  const [complaints, setComplaints] =
    useState<Complaint[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [
    updatingStepKey,
    setUpdatingStepKey,
  ] = useState<string | null>(null);

  const [
    runningEscalation,
    setRunningEscalation,
  ] = useState(false);

  const [
    processingResolutionId,
    setProcessingResolutionId,
  ] = useState<string | null>(null);

  const [
    manualVerifyId,
    setManualVerifyId,
  ] = useState<string | null>(null);

  const [
    resolutionFiles,
    setResolutionFiles,
  ] = useState<
    Record<string, File | null>
  >({});

  useEffect(() => {
    fetchComplaints();
  }, []);

  // =================================
  // FETCH
  // =================================

  const fetchComplaints = async () => {
    setLoading(true);

    const { data, error } =
      await supabase
        .from("complaints")
        .select("*")
        .order("created_at", {
          ascending: false,
        });

    if (error) {
      console.error(error);

      alert(
        "Failed to load complaints."
      );
    } else {
      setComplaints(
        (data || []) as Complaint[]
      );
    }

    setLoading(false);
  };

  // =================================
  // ESCALATION AGENT
  // =================================

  const runEscalationAgent =
    async () => {
      try {
        setRunningEscalation(true);

        const response =
          await fetch(
            "/api/escalate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                demoMode: true,
              }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Escalation failed."
          );
        }

        await fetchComplaints();

        alert(
          `🚨 Escalation Agent Completed

Checked: ${result.checked}
Newly Escalated: ${result.newly_escalated}`
        );
      } catch (error) {
        alert(
          error instanceof Error
            ? error.message
            : "Escalation failed."
        );
      } finally {
        setRunningEscalation(
          false
        );
      }
    };

  // =================================
  // MAIN STATUS
  // =================================

  const updateStatus = async (
    id: string,
    newStatus: string
  ) => {
    const complaint =
      complaints.find(
        (item) =>
          item.id === id
      );

    if (!complaint) {
      return;
    }

    if (
      newStatus === "Resolved" &&
      complaint.resolution_verified !==
        true
    ) {
      alert(
        `🔒 Resolution verification required.

AI verification or authority verification must be completed first.`
      );

      return;
    }

    setUpdatingId(id);

    const { error } =
      await supabase
        .from("complaints")
        .update({
          status: newStatus,
        })
        .eq("id", id);

    if (error) {
      alert(
        error.message
      );

      setUpdatingId(null);

      return;
    }

    setComplaints(
      (current) =>
        current.map(
          (item) =>
            item.id === id
              ? {
                  ...item,
                  status:
                    newStatus,
                }
              : item
        )
    );

    setUpdatingId(null);
  };

  // =================================
  // ACTION PLAN
  // =================================

  const updateActionStepStatus =
    async (
      complaintId: string,
      stepIndex: number,
      newStatus: StepStatus
    ) => {
      const stepKey =
        `${complaintId}-${stepIndex}`;

      const complaint =
        complaints.find(
          (item) =>
            item.id ===
            complaintId
        );

      if (
        !complaint ||
        !Array.isArray(
          complaint.action_plan
        )
      ) {
        return;
      }

      const actionPlan =
        complaint.action_plan;

      const currentStep =
        actionPlan[stepIndex];

      if (!currentStep) {
        return;
      }

      // STRICT PREVIOUS STEP CHECK

      if (
        newStatus !==
        "Pending"
      ) {
        for (
          let i = 0;
          i < stepIndex;
          i++
        ) {
          const previous =
            actionPlan[i];

          if (
            (
              previous.status ||
              "Pending"
            ) !== "Completed"
          ) {
            alert(
              `🔒 Step ${
                currentStep.step ||
                stepIndex + 1
              } is locked.

Complete Step ${
                previous.step ||
                i + 1
              } first.`
            );

            return;
          }
        }
      }

      // AI DEPENDENCY

      if (
        newStatus !== "Pending" &&
        currentStep.depends_on !==
          null &&
        currentStep.depends_on !==
          undefined
      ) {
        const dependency =
          Number(
            currentStep.depends_on
          );

        const dependencyStep =
          actionPlan.find(
            (step, index) =>
              Number(
                step.step ||
                  index + 1
              ) ===
              dependency
          );

        if (
          !dependencyStep ||
          (
            dependencyStep.status ||
            "Pending"
          ) !== "Completed"
        ) {
          alert(
            `🔒 Complete Step ${dependency} first.`
          );

          return;
        }
      }

      // PREVENT BACKWARD BREAK

      if (
        newStatus !==
        "Completed"
      ) {
        const laterStarted =
          actionPlan.some(
            (step, index) =>
              index >
                stepIndex &&
              (
                step.status ===
                  "In Progress" ||
                step.status ===
                  "Completed"
              )
          );

        if (laterStarted) {
          alert(
            "⚠ A later workflow step has already started."
          );

          return;
        }
      }

      setUpdatingStepKey(
        stepKey
      );

      const updatedPlan =
        actionPlan.map(
          (step, index) => ({
            ...step,

            status:
              index === stepIndex
                ? newStatus
                : step.status ||
                  "Pending",
          })
        );

      const allCompleted =
        updatedPlan.length > 0 &&
        updatedPlan.every(
          (step) =>
            step.status ===
            "Completed"
        );

      const anyStarted =
        updatedPlan.some(
          (step) =>
            step.status ===
              "Completed" ||
            step.status ===
              "In Progress"
        );

      let overallStatus =
        "Assigned";

      if (allCompleted) {
        overallStatus =
          complaint.resolution_verified
            ? "Resolved"
            : "Awaiting Verification";
      } else if (anyStarted) {
        overallStatus =
          "In Progress";
      }

      const { error } =
        await supabase
          .from("complaints")
          .update({
            action_plan:
              updatedPlan,

            status:
              overallStatus,
          })
          .eq(
            "id",
            complaintId
          );

      if (error) {
        alert(
          error.message
        );

        setUpdatingStepKey(
          null
        );

        return;
      }

      setComplaints(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              complaintId
                ? {
                    ...item,
                    action_plan:
                      updatedPlan,
                    status:
                      overallStatus,
                  }
                : item
          )
      );

      setUpdatingStepKey(
        null
      );

      if (
        allCompleted &&
        !complaint.resolution_verified
      ) {
        alert(
          `✅ Department workflow completed.

Complaint is now Awaiting Verification.`
        );
      }
    };

  // =================================
  // RESOLUTION FILE
  // =================================

  const handleResolutionFileChange = (
    complaintId: string,
    file: File | null
  ) => {
    setResolutionFiles(
      (current) => ({
        ...current,

        [complaintId]:
          file,
      })
    );
  };

  // =================================
  // AI VERIFY
  // =================================

  const uploadAndVerifyResolution =
    async (
      complaint: Complaint
    ) => {
      const file =
        resolutionFiles[
          complaint.id
        ];

      if (!file) {
        alert(
          "Choose an After / Resolution image first."
        );

        return;
      }

      if (
        complaint.requires_coordination
      ) {
        const plan =
          Array.isArray(
            complaint.action_plan
          )
            ? complaint.action_plan
            : [];

        const allCompleted =
          plan.length > 0 &&
          plan.every(
            (step) =>
              step.status ===
              "Completed"
          );

        if (!allCompleted) {
          alert(
            "🔒 Complete all action plan steps first."
          );

          return;
        }
      }

      try {
        setProcessingResolutionId(
          complaint.id
        );

        const extension =
          file.name
            .split(".")
            .pop() ||
          "jpg";

        const filePath =
          `${complaint.id}/${Date.now()}.${extension}`;

        const {
          error: uploadError,
        } =
          await supabase.storage
            .from(
              "resolution-images"
            )
            .upload(
              filePath,
              file,
              {
                upsert: false,

                contentType:
                  file.type,
              }
            );

        if (uploadError) {
          throw new Error(
            uploadError.message
          );
        }

        const {
          data: urlData,
        } =
          supabase.storage
            .from(
              "resolution-images"
            )
            .getPublicUrl(
              filePath
            );

        const resolutionUrl =
          urlData.publicUrl;

        const {
          error: saveError,
        } =
          await supabase
            .from("complaints")
            .update({
              resolution_image_url:
                resolutionUrl,

              resolution_verification_status:
                "AI Reviewing",

              resolution_confidence:
                null,

              resolution_reason:
                null,

              resolution_verified:
                false,

              verified_at:
                null,

              status:
                "Awaiting Verification",
            })
            .eq(
              "id",
              complaint.id
            );

        if (saveError) {
          throw new Error(
            saveError.message
          );
        }

        const response =
          await fetch(
            "/api/verify-resolution",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  complaintId:
                    complaint.id,
                }),
            }
          );

        const result =
          await response.json();

        await fetchComplaints();

        setResolutionFiles(
          (current) => ({
            ...current,

            [complaint.id]:
              null,
          })
        );

        if (
          result.status ===
          "Verified"
        ) {
          alert(
            `✅ AI VERIFIED

Confidence: ${result.confidence}%

${result.reason}`
          );

          return;
        }

        if (
          result.status ===
          "Rejected"
        ) {
          alert(
            `❌ RESOLUTION REJECTED

Confidence: ${result.confidence}%

${result.reason}`
          );

          return;
        }

        alert(
          `⚠ MANUAL REVIEW REQUIRED

AI Confidence: ${result.confidence || 0}%

${result.reason || "AI verification unavailable."}`
        );
      } catch (error) {
        console.error(
          error
        );

        await fetchComplaints();

        alert(
          error instanceof Error
            ? error.message
            : "Verification failed."
        );
      } finally {
        setProcessingResolutionId(
          null
        );
      }
    };

  // =================================
  // HUMAN AUTHORITY VERIFY
  // =================================

  const authorityVerifyResolution =
    async (
      complaint: Complaint
    ) => {
      if (
        !complaint.resolution_image_url
      ) {
        alert(
          "Resolution evidence is required first."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Authority Verification

Have you manually reviewed the AFTER evidence and confirmed that this civic issue has been resolved?

Click OK only if the resolution is genuinely verified.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setManualVerifyId(
          complaint.id
        );

        const response =
          await fetch(
            "/api/manual-verify",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  complaintId:
                    complaint.id,
                }),
            }
          );

        const result =
          await response.json();

        if (!response.ok) {
          throw new Error(
            result.error ||
              "Manual verification failed."
          );
        }

        await fetchComplaints();

        alert(
          `✅ AUTHORITY VERIFIED

Resolution evidence has been manually approved.

Complaint Status: Resolved`
        );
      } catch (error) {
        console.error(
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Manual verification failed."
        );
      } finally {
        setManualVerifyId(
          null
        );
      }
    };

  // =================================
  // ORIGINAL DUPLICATE
  // =================================

  const scrollToComplaint = (
    id: string
  ) => {
    const element =
      document.getElementById(
        `complaint-${id}`
      );

    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  };

  // =================================
  // STATS
  // =================================

  const total =
    complaints.length;

  const critical =
    complaints.filter(
      (item) =>
        item.priority ===
        "Critical"
    ).length;

  const resolved =
    complaints.filter(
      (item) =>
        item.status ===
        "Resolved"
    ).length;

  const pending =
    complaints.filter(
      (item) =>
        item.status !==
        "Resolved"
    ).length;

  const duplicates =
    complaints.filter(
      (item) =>
        item.is_duplicate
    ).length;

  const coordinated =
    complaints.filter(
      (item) =>
        item.requires_coordination
    ).length;

  const escalated =
    complaints.filter(
      (item) =>
        item.is_escalated
    ).length;

  const verified =
    complaints.filter(
      (item) =>
        item.resolution_verified
    ).length;

  // =================================
  // STYLES
  // =================================

  const priorityStyle = (
    priority: string | null
  ) => {
    if (
      priority ===
      "Critical"
    )
      return "border-red-500/30 bg-red-500/15 text-red-400";

    if (
      priority === "High"
    )
      return "border-orange-500/30 bg-orange-500/15 text-orange-400";

    if (
      priority ===
      "Medium"
    )
      return "border-yellow-500/30 bg-yellow-500/15 text-yellow-300";

    return "border-white/10 bg-white/5 text-slate-300";
  };

  const verificationStyle = (
    status: string | null
  ) => {
    if (
      status === "Verified"
    )
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";

    if (
      status ===
      "Manually Verified"
    )
      return "border-blue-500/30 bg-blue-500/10 text-blue-300";

    if (
      status === "Rejected"
    )
      return "border-red-500/30 bg-red-500/10 text-red-300";

    if (
      status ===
      "AI Reviewing"
    )
      return "border-cyan-500/30 bg-cyan-500/10 text-cyan-300";

    if (
      status ===
      "Needs Review"
    )
      return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";

    return "border-white/10 bg-white/5 text-slate-400";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">

      {/* NAV */}

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
              Authority Command Center
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            <button
              onClick={
                fetchComplaints
              }
              className="rounded-lg border border-white/10 px-4 py-2 text-sm"
            >
              ↻ Refresh
            </button>

            <button
              onClick={
                runEscalationAgent
              }
              disabled={
                runningEscalation
              }
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300"
            >
              {runningEscalation
                ? "🚨 Checking..."
                : "🚨 Run Escalation Agent"}
            </button>

            <Link
              href="/map"
              className="rounded-lg border border-cyan-400/30 px-4 py-2 text-sm text-cyan-400"
            >
              🗺 Live Map
            </Link>

            <Link
              href="/analytics"
              className="rounded-lg border border-purple-400/30 px-4 py-2 text-sm text-purple-300"
            >
              📊 Analytics
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

        <p className="text-sm font-semibold text-cyan-400">
          CIVIC COMMAND CENTER
        </p>

        <h2 className="mt-2 text-3xl font-bold">
          Intelligent Incident Dashboard
        </h2>

        <p className="mt-2 text-slate-400">
          AI agents with human authority oversight.
        </p>

        {/* STATS */}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">

          <Stat title="Total" value={total} />

          <Stat title="Critical" value={critical} />

          <Stat title="Pending" value={pending} />

          <Stat title="Resolved" value={resolved} />

          <Stat title="Duplicates" value={duplicates} />

          <Stat title="Coordinated" value={coordinated} />

          <Stat title="Escalated" value={escalated} />

          <Stat title="Verified" value={verified} />

        </div>

        {/* CARDS */}

        <div className="mt-10">

          {loading ? (
            <p>
              Loading...
            </p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">

              {complaints.map(
                (complaint) => {

                  const plan =
                    Array.isArray(
                      complaint.action_plan
                    )
                      ? complaint.action_plan
                      : [];

                  const completed =
                    plan.filter(
                      (step) =>
                        step.status ===
                        "Completed"
                    ).length;

                  const progress =
                    plan.length
                      ? Math.round(
                          completed /
                            plan.length *
                            100
                        )
                      : 0;

                  return (
                    <div
                      key={
                        complaint.id
                      }
                      id={`complaint-${complaint.id}`}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                    >

                      {/* BADGES */}

                      <div className="flex flex-wrap gap-2">

                        <span
                          className={`rounded-full border px-3 py-1 text-xs ${priorityStyle(
                            complaint.priority
                          )}`}
                        >
                          {complaint.priority}
                        </span>

                        {complaint.is_duplicate && (
                          <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs text-purple-300">
                            ⚠ DUPLICATE
                          </span>
                        )}

                        {complaint.requires_coordination && (
                          <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs text-blue-300">
                            🤖 MULTI-DEPARTMENT
                          </span>
                        )}

                        {complaint.is_escalated && (
                          <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-300">
                            🚨 LEVEL{" "}
                            {
                              complaint.escalation_level
                            }
                          </span>
                        )}

                      </div>

                      <h3 className="mt-4 text-xl font-semibold">

                        {complaint.category}

                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-300">

                        {
                          complaint.description
                        }

                      </p>

                      {/* ORIGINAL IMAGE */}

                      {complaint.image_url && (

                        <div className="mt-5">

                          <p className="mb-2 text-xs text-slate-500">
                            BEFORE / ORIGINAL EVIDENCE
                          </p>

                          <img
                            src={
                              complaint.image_url
                            }
                            alt="Before"
                            className="max-h-72 w-full rounded-xl object-cover"
                          />

                        </div>

                      )}

                      {/* DUPLICATE */}

                      {complaint.is_duplicate && (

                        <div className="mt-5 rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">

                          <p className="font-semibold text-purple-300">
                            AI Duplicate Detection
                          </p>

                          <p className="mt-2 text-sm">
                            Confidence:{" "}
                            {
                              complaint.duplicate_confidence
                            }
                            %
                          </p>

                          <p className="mt-2 text-sm text-slate-300">
                            {
                              complaint.duplicate_reason
                            }
                          </p>

                          {complaint.duplicate_of && (

                            <button
                              onClick={() =>
                                scrollToComplaint(
                                  complaint.duplicate_of!
                                )
                              }
                              className="mt-3 rounded-lg bg-purple-400 px-3 py-2 text-xs font-bold text-slate-950"
                            >
                              View Original
                            </button>

                          )}

                        </div>

                      )}

                      {/* ESCALATION */}

                      {complaint.is_escalated && (

                        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4">

                          <p className="font-semibold text-red-300">
                            🚨 Automatic Escalation Agent
                          </p>

                          <p className="mt-2 text-sm text-slate-300">
                            {
                              complaint.escalation_reason
                            }
                          </p>

                        </div>

                      )}

                      {/* ACTION PLAN */}

                      {complaint.requires_coordination &&
                        plan.length > 0 && (

                        <div className="mt-5 rounded-xl border border-blue-500/30 bg-blue-500/5 p-4">

                          <p className="font-semibold text-blue-300">
                            🤖 AI Multi-Department Action Plan
                          </p>

                          <div className="mt-4">

                            <div className="flex justify-between text-xs">

                              <span>
                                Progress
                              </span>

                              <span>
                                {progress}%
                              </span>

                            </div>

                            <div className="mt-2 h-2 rounded-full bg-slate-800">

                              <div
                                className="h-full rounded-full bg-cyan-400"
                                style={{
                                  width:
                                    `${progress}%`,
                                }}
                              />

                            </div>

                          </div>

                          <div className="mt-5 space-y-3">

                            {plan.map(
                              (
                                step,
                                index
                              ) => {

                                const status =
                                  step.status ||
                                  "Pending";

                                const previousComplete =
                                  index ===
                                    0 ||
                                  plan
                                    .slice(
                                      0,
                                      index
                                    )
                                    .every(
                                      (item) =>
                                        item.status ===
                                        "Completed"
                                    );

                                return (
                                  <div
                                    key={
                                      index
                                    }
                                    className="rounded-xl border border-white/10 bg-slate-950/50 p-4"
                                  >

                                    <div className="flex justify-between gap-3">

                                      <div>

                                        <p className="font-semibold text-cyan-300">

                                          Step{" "}
                                          {step.step ||
                                            index +
                                              1}{" "}
                                          —{" "}
                                          {
                                            step.department
                                          }

                                        </p>

                                        <p className="mt-2 text-sm text-slate-300">

                                          {
                                            step.action
                                          }

                                        </p>

                                      </div>

                                      {!previousComplete && (

                                        <span className="text-xs text-red-300">
                                          🔒 Locked
                                        </span>

                                      )}

                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">

                                      {[
                                        "Pending",
                                        "In Progress",
                                        "Completed",
                                      ].map(
                                        (
                                          buttonStatus
                                        ) => (

                                          <button
                                            key={
                                              buttonStatus
                                            }
                                            onClick={() =>
                                              updateActionStepStatus(
                                                complaint.id,
                                                index,
                                                buttonStatus as StepStatus
                                              )
                                            }
                                            disabled={
                                              updatingStepKey ===
                                              `${complaint.id}-${index}`
                                            }
                                            className={`rounded-lg px-3 py-2 text-xs ${
                                              status ===
                                              buttonStatus
                                                ? "bg-cyan-400 text-slate-950"
                                                : "border border-white/10"
                                            }`}
                                          >
                                            {
                                              buttonStatus
                                            }
                                          </button>

                                        )
                                      )}

                                    </div>

                                  </div>
                                );
                              }
                            )}

                          </div>

                        </div>

                      )}

                      {/* RESOLUTION */}

                      <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5">

                        <div className="flex flex-wrap items-center justify-between gap-3">

                          <div>

                            <p className="font-semibold text-emerald-300">
                              📸 AI Resolution Verification
                            </p>

                            <p className="text-xs text-slate-500">
                              AI first, authority review when required
                            </p>

                          </div>

                          <span
                            className={`rounded-full border px-3 py-1 text-xs ${verificationStyle(
                              complaint.resolution_verification_status
                            )}`}
                          >
                            {complaint.resolution_verification_status ||
                              "Not Submitted"}
                          </span>

                        </div>

                        {complaint.resolution_image_url && (

                          <div className="mt-4">

                            <p className="mb-2 text-xs text-slate-500">
                              RESOLUTION / AFTER EVIDENCE
                            </p>

                            <img
                              src={
                                complaint.resolution_image_url
                              }
                              alt="After"
                              className="max-h-72 w-full rounded-xl object-cover"
                            />

                          </div>

                        )}

                        {complaint.resolution_reason && (

                          <div className="mt-4 rounded-xl bg-slate-950/50 p-4">

                            <p className="text-xs text-slate-500">
                              VERIFICATION REASON
                            </p>

                            <p className="mt-2 text-sm text-slate-300">
                              {
                                complaint.resolution_reason
                              }
                            </p>

                            {complaint.resolution_confidence !==
                              null && (

                              <p className="mt-2 text-sm text-cyan-400">
                                Confidence:{" "}
                                {
                                  complaint.resolution_confidence
                                }
                                %
                              </p>

                            )}

                          </div>

                        )}

                        {!complaint.resolution_verified && (

                          <div className="mt-5">

                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) =>
                                handleResolutionFileChange(
                                  complaint.id,
                                  event.target.files?.[0] ||
                                    null
                                )
                              }
                              className="block w-full rounded-xl border border-white/10 bg-slate-950 p-3 text-sm"
                            />

                            <button
                              onClick={() =>
                                uploadAndVerifyResolution(
                                  complaint
                                )
                              }
                              disabled={
                                !resolutionFiles[
                                  complaint.id
                                ] ||
                                processingResolutionId ===
                                  complaint.id
                              }
                              className="mt-3 w-full rounded-xl bg-emerald-400 py-3 text-sm font-bold text-slate-950 disabled:opacity-40"
                            >
                              {processingResolutionId ===
                              complaint.id
                                ? "🤖 AI Reviewing..."
                                : "📸 Upload & Verify with AI"}
                            </button>

                          </div>

                        )}

                        {/* HUMAN-IN-THE-LOOP */}

                        {complaint.resolution_verification_status ===
                          "Needs Review" &&
                          complaint.resolution_image_url &&
                          !complaint.resolution_verified && (

                          <div className="mt-5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">

                            <p className="font-semibold text-yellow-300">
                              👤 Human Authority Review Required
                            </p>

                            <p className="mt-2 text-sm leading-6 text-slate-300">
                              AI could not complete a reliable verification. An authorized reviewer can inspect the submitted evidence and make the final decision.
                            </p>

                            <button
                              type="button"
                              disabled={
                                manualVerifyId ===
                                complaint.id
                              }
                              onClick={() =>
                                authorityVerifyResolution(
                                  complaint
                                )
                              }
                              className="mt-4 w-full rounded-xl bg-blue-400 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
                            >
                              {manualVerifyId ===
                              complaint.id
                                ? "Verifying..."
                                : "✅ Authority Verify & Resolve"}
                            </button>

                          </div>

                        )}

                        {complaint.resolution_verified && (

                          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">

                            <p className="font-bold text-emerald-300">

                              {complaint.resolution_verification_status ===
                              "Manually Verified"
                                ? "✅ Verified by Human Authority"
                                : "✅ Verified by AI"}

                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              Complaint successfully resolved.
                            </p>

                          </div>

                        )}

                      </div>

                      {/* STATUS */}

                      <div className="mt-5 border-t border-white/10 pt-5">

                        <p className="text-sm text-slate-400">
                          Complaint Status
                        </p>

                        <p className="mt-1 font-semibold text-cyan-300">
                          {complaint.status}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">

                          {[
                            "Reported",
                            "Assigned",
                            "In Progress",
                            "Awaiting Verification",
                            "Resolved",
                          ].map(
                            (
                              status
                            ) => (

                              <button
                                key={
                                  status
                                }
                                onClick={() =>
                                  updateStatus(
                                    complaint.id,
                                    status
                                  )
                                }
                                disabled={
                                  updatingId ===
                                  complaint.id
                                }
                                className={`rounded-lg px-3 py-2 text-xs ${
                                  complaint.status ===
                                  status
                                    ? "bg-cyan-400 text-slate-950"
                                    : "border border-white/10"
                                }`}
                              >
                                {status}
                              </button>

                            )
                          )}

                        </div>

                      </div>

                      <p className="mt-5 break-all text-xs text-slate-600">
                        Report ID:{" "}
                        {
                          complaint.id
                        }
                      </p>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

      </section>

    </main>
  );
}

function Stat({
  title,
  value,
}: {
  title: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">

      <p className="text-xs text-slate-400">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>

    </div>
  );
}