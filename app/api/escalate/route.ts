import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

type ActionPlanStep = {
  step?: number;
  department?: string;
  action?: string;
  depends_on?: number | null;
  status?: string;
};

type Complaint = {
  id: string;
  description: string | null;
  priority: string | null;
  status: string | null;
  department: string | null;
  created_at: string;

  is_escalated: boolean | null;
  escalation_level: number | null;
  escalation_reason: string | null;
  escalated_at: string | null;

  requires_coordination: boolean | null;
  action_plan: ActionPlanStep[] | null;
};

function getProductionThresholdMinutes(
  priority: string | null
) {
  switch (priority) {
    case "Critical":
      return 30;

    case "High":
      return 120;

    case "Medium":
      return 360;

    case "Low":
      return 1440;

    default:
      return 360;
  }
}

function getCurrentWorkflowStep(
  actionPlan: ActionPlanStep[] | null
) {
  if (!Array.isArray(actionPlan)) {
    return null;
  }

  return (
    actionPlan.find(
      (step) =>
        step.status !== "Completed"
    ) || null
  );
}

export async function POST(
  request: Request
) {
  try {
    let demoMode = false;

    try {
      const body = await request.json();

      demoMode =
        body?.demoMode === true;
    } catch {
      // Body optional hai.
    }

    // =================================
    // FETCH UNRESOLVED COMPLAINTS
    // =================================

    const { data, error } =
      await supabase
        .from("complaints")
        .select(
          `
          id,
          description,
          priority,
          status,
          department,
          created_at,
          is_escalated,
          escalation_level,
          escalation_reason,
          escalated_at,
          requires_coordination,
          action_plan
        `
        )
        .neq("status", "Resolved");

    if (error) {
      console.error(
        "Escalation Fetch Error:",
        error
      );

      return NextResponse.json(
        {
          error:
            "Failed to fetch complaints.",
          details:
            error.message,
        },
        {
          status: 500,
        }
      );
    }

    const complaints =
      (data || []) as Complaint[];

    const now =
      new Date();

    const escalatedComplaints: {
      id: string;
      priority: string | null;
      old_level: number;
      new_level: number;
      age_minutes: number;
      reason: string;
    }[] = [];

    const checkedComplaints: {
      id: string;
      age_minutes: number;
      threshold_minutes: number;
      level: number;
      escalated: boolean;
    }[] = [];

    // =================================
    // CHECK EACH COMPLAINT
    // =================================

    for (
      const complaint of complaints
    ) {
      const createdAt =
        new Date(
          complaint.created_at
        );

      const ageMinutes =
        Math.floor(
          (
            now.getTime() -
            createdAt.getTime()
          ) /
            60000
        );

      // =================================
      // SLA THRESHOLD
      // =================================

      const productionThreshold =
        getProductionThresholdMinutes(
          complaint.priority
        );

      // Hackathon demo:
      // Level 1 after 1 minute
      // Level 2 after 3 minutes
      const level1Threshold =
        demoMode
          ? 1
          : productionThreshold;

      const level2Threshold =
        demoMode
          ? 3
          : productionThreshold * 2;

      const currentLevel =
        Number(
          complaint.escalation_level
        ) || 0;

      let targetLevel =
        currentLevel;

      if (
        ageMinutes >=
        level2Threshold
      ) {
        targetLevel = 2;
      } else if (
        ageMinutes >=
        level1Threshold
      ) {
        targetLevel = 1;
      }

      checkedComplaints.push({
        id: complaint.id,
        age_minutes:
          ageMinutes,
        threshold_minutes:
          level1Threshold,
        level:
          currentLevel,
        escalated:
          currentLevel > 0,
      });

      // Already correct level hai
      // to duplicate escalation na karo.
      if (
        targetLevel <=
        currentLevel
      ) {
        await supabase
          .from("complaints")
          .update({
            last_escalation_check:
              now.toISOString(),
          })
          .eq(
            "id",
            complaint.id
          );

        continue;
      }

      // =================================
      // CURRENT BLOCKED WORKFLOW STEP
      // =================================

      const currentStep =
        getCurrentWorkflowStep(
          complaint.action_plan
        );

      let reason = "";

      if (
        targetLevel === 1
      ) {
        reason =
          `${complaint.priority || "Civic"} complaint has remained unresolved for ${ageMinutes} minute(s), exceeding the Level 1 SLA threshold.`;

        if (
          currentStep?.department
        ) {
          reason +=
            ` Current pending workflow responsibility: ${currentStep.department}.`;
        }

        reason +=
          " Escalated to the department supervisor for immediate attention.";
      }

      if (
        targetLevel === 2
      ) {
        reason =
          `${complaint.priority || "Civic"} complaint has remained unresolved for ${ageMinutes} minute(s) and has exceeded the Level 2 escalation threshold.`;

        if (
          currentStep?.department
        ) {
          reason +=
            ` The workflow is currently awaiting action from ${currentStep.department}.`;
        }

        reason +=
          " Escalated to senior authority for urgent intervention.";
      }

      // =================================
      // UPDATE SUPABASE
      // =================================

      const {
        error: updateError,
      } =
        await supabase
          .from("complaints")
          .update({
            is_escalated: true,

            escalation_level:
              targetLevel,

            escalation_reason:
              reason,

            escalated_at:
              now.toISOString(),

            last_escalation_check:
              now.toISOString(),
          })
          .eq(
            "id",
            complaint.id
          );

      if (updateError) {
        console.error(
          "Escalation Update Error:",
          complaint.id,
          updateError
        );

        continue;
      }

      escalatedComplaints.push({
        id: complaint.id,

        priority:
          complaint.priority,

        old_level:
          currentLevel,

        new_level:
          targetLevel,

        age_minutes:
          ageMinutes,

        reason,
      });
    }

    // =================================
    // RESPONSE
    // =================================

    return NextResponse.json({
      success: true,

      mode:
        demoMode
          ? "DEMO"
          : "PRODUCTION",

      checked:
        complaints.length,

      newly_escalated:
        escalatedComplaints.length,

      escalated:
        escalatedComplaints,

      checks:
        checkedComplaints,
    });
  } catch (error) {
    console.error(
      "Escalation Agent Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Escalation agent failed.",
      },
      {
        status: 500,
      }
    );
  }
}