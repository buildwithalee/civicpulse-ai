import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type ActionStep = {
  step: number;
  department: string;
  action: string;
  depends_on: number | null;
  status: "Pending";
};

type CoordinationResult = {
  requires_coordination: boolean;
  primary_department: string;
  involved_departments: string[];
  coordination_reason: string;
  action_plan: ActionStep[];
  coordination_source: "deterministic" | "gemini" | "fallback";
};

const wait = (ms: number) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

// =====================================
// ELECTRICAL + TRAFFIC FAIL-SAFE
// =====================================

function detectDeterministicCoordination(
  description: string,
  category: string,
  department: string
): CoordinationResult | null {
  const text =
    `${description} ${category}`.toLowerCase();

  const electricalWords = [
    "electric",
    "electrical",
    "wire",
    "cable",
    "live wire",
    "power line",
    "shock",
    "pole",
    "transformer",
  ];

  const roadTrafficWords = [
    "road",
    "street",
    "traffic",
    "vehicle",
    "vehicles",
    "motorcycle",
    "motorcyclist",
    "blocking",
    "blocked",
    "obstruction",
    "pedestrian",
    "pedestrians",
  ];

  const hasElectrical =
    electricalWords.some((word) =>
      text.includes(word)
    );

  const hasRoadTraffic =
    roadTrafficWords.some((word) =>
      text.includes(word)
    );

  // =====================================
  // CRITICAL DEMO CASE:
  // Live wire + road/traffic
  // =====================================

  if (
    hasElectrical &&
    hasRoadTraffic
  ) {
    return {
      requires_coordination: true,

      primary_department:
        department ||
        "Electricity Department",

      involved_departments: [
        "Electricity Department",
        "Traffic Management Department",
        "Municipal / Road Department",
      ],

      coordination_reason:
        "The electrical hazard is affecting a public road and disrupting traffic. Electricity personnel must secure the live hazard first, traffic authorities must control access, and the municipal or road team can restore normal road movement after the electrical danger is removed.",

      action_plan: [
        {
          step: 1,
          department:
            "Electricity Department",
          action:
            "Immediately isolate the electrical supply, secure the fallen live wire, and make the area safe from electric shock.",
          depends_on: null,
          status: "Pending",
        },

        {
          step: 2,
          department:
            "Traffic Management Department",
          action:
            "Restrict access around the hazardous section, redirect vehicles and pedestrians, and manage traffic until the electrical danger is removed.",
          depends_on: 1,
          status: "Pending",
        },

        {
          step: 3,
          department:
            "Municipal / Road Department",
          action:
            "Clear any remaining obstruction, inspect the affected road area, and restore safe normal traffic movement.",
          depends_on: 2,
          status: "Pending",
        },
      ],

      coordination_source:
        "deterministic",
    };
  }

  return null;
}

// =====================================
// OTHER BASIC FAIL-SAFE CASES
// =====================================

function fallbackCoordination(
  description: string,
  category: string,
  department: string
): CoordinationResult {
  const text =
    `${description} ${category}`.toLowerCase();

  // Water/sewer affecting road
  const waterIssue =
    text.includes("water") ||
    text.includes("sewer") ||
    text.includes("sewage") ||
    text.includes("drain");

  const roadIssue =
    text.includes("road") ||
    text.includes("traffic") ||
    text.includes("street") ||
    text.includes("blocking");

  if (
    waterIssue &&
    roadIssue
  ) {
    return {
      requires_coordination: true,

      primary_department:
        department ||
        "Water & Sewerage Department",

      involved_departments: [
        "Water & Sewerage Department",
        "Municipal / Road Department",
      ],

      coordination_reason:
        "The water or sewer problem is also affecting the road, requiring infrastructure repair followed by road restoration.",

      action_plan: [
        {
          step: 1,
          department:
            "Water & Sewerage Department",
          action:
            "Identify and repair the water or sewer infrastructure problem.",
          depends_on: null,
          status: "Pending",
        },

        {
          step: 2,
          department:
            "Municipal / Road Department",
          action:
            "Clean and restore the affected road after the utility repair is completed.",
          depends_on: 1,
          status: "Pending",
        },
      ],

      coordination_source:
        "fallback",
    };
  }

  return {
    requires_coordination: false,

    primary_department:
      department ||
      "Municipal Department",

    involved_departments:
      department
        ? [department]
        : ["Municipal Department"],

    coordination_reason:
      "The complaint can currently be handled by the primary assigned department.",

    action_plan: [],

    coordination_source:
      "fallback",
  };
}

// =====================================
// POST
// =====================================

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const description =
      typeof body.description ===
      "string"
        ? body.description.trim()
        : "";

    const category =
      typeof body.category ===
      "string"
        ? body.category.trim()
        : "";

    const priority =
      typeof body.priority ===
      "string"
        ? body.priority.trim()
        : "";

    const department =
      typeof body.department ===
      "string"
        ? body.department.trim()
        : "";

    const location =
      typeof body.location ===
      "string"
        ? body.location.trim()
        : "Unknown";

    if (!description) {
      return NextResponse.json(
        {
          error:
            "Description is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =====================================
    // FIRST: deterministic agent
    // =====================================

    const deterministic =
      detectDeterministicCoordination(
        description,
        category,
        department
      );

    if (deterministic) {
      console.log(
        "Coordination determined locally:",
        deterministic
      );

      return NextResponse.json(
        deterministic
      );
    }

    // =====================================
    // GEMINI
    // =====================================

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        fallbackCoordination(
          description,
          category,
          department
        )
      );
    }

    try {
      const ai =
        new GoogleGenAI({
          apiKey,
        });

      const prompt = `
You are the Multi-Department Coordination Agent for CivicPulse AI.

Analyze this civic complaint and decide whether multiple government departments must coordinate.

Complaint:
${description}

Category:
${category || "Unknown"}

Priority:
${priority || "Unknown"}

Primary Department:
${department || "Unknown"}

Location:
${location}

IMPORTANT RULES:

1. If one department can completely solve the issue, requires_coordination should be false.

2. If solving the incident requires different departments in sequence, requires_coordination should be true.

3. Electrical hazards affecting roads or traffic should usually involve:
   - Electricity Department
   - Traffic Management Department
   - Municipal / Road Department when road clearance/restoration is required

4. Water/sewer incidents damaging or blocking roads may require:
   - Water & Sewerage Department
   - Municipal / Road Department

5. Action steps must be ordered logically.

6. A later step should depend on the previous required step.

Return ONLY valid JSON:

{
  "requires_coordination": true,
  "primary_department": "Electricity Department",
  "involved_departments": [
    "Electricity Department",
    "Traffic Management Department",
    "Municipal / Road Department"
  ],
  "coordination_reason": "Short explanation",
  "action_plan": [
    {
      "step": 1,
      "department": "Electricity Department",
      "action": "Action description",
      "depends_on": null
    },
    {
      "step": 2,
      "department": "Traffic Management Department",
      "action": "Action description",
      "depends_on": 1
    }
  ]
}
`;

      let lastError:
        unknown = null;

      for (
        let attempt = 1;
        attempt <= 3;
        attempt++
      ) {
        try {
          const response =
            await ai.models.generateContent({
              model:
                "gemini-3.6-flash",

              contents:
                prompt,
            });

          const cleanText =
            (
              response.text ||
              ""
            )
              .replace(
                /```json/gi,
                ""
              )
              .replace(
                /```/g,
                ""
              )
              .trim();

          if (!cleanText) {
            throw new Error(
              "Empty Gemini coordination response."
            );
          }

          const result =
            JSON.parse(
              cleanText
            );

          const requiresCoordination =
            result.requires_coordination ===
            true;

          const departments =
            Array.isArray(
              result.involved_departments
            )
              ? result.involved_departments.filter(
                  (
                    item: unknown
                  ) =>
                    typeof item ===
                      "string"
                )
              : [];

          const rawPlan =
            Array.isArray(
              result.action_plan
            )
              ? result.action_plan
              : [];

          const actionPlan:
            ActionStep[] =
            rawPlan.map(
              (
                step: {
                  step?: unknown;
                  department?: unknown;
                  action?: unknown;
                  depends_on?: unknown;
                },
                index: number
              ) => ({
                step:
                  Number(
                    step.step
                  ) ||
                  index + 1,

                department:
                  typeof step.department ===
                  "string"
                    ? step.department
                    : department ||
                      "Municipal Department",

                action:
                  typeof step.action ===
                  "string"
                    ? step.action
                    : "Review and address the assigned civic issue.",

                depends_on:
                  step.depends_on ===
                    null ||
                  step.depends_on ===
                    undefined
                    ? null
                    : Number(
                        step.depends_on
                      ) ||
                      null,

                status:
                  "Pending",
              })
            );

          return NextResponse.json({
            requires_coordination:
              requiresCoordination,

            primary_department:
              typeof result.primary_department ===
                "string"
                ? result.primary_department
                : department ||
                  "Municipal Department",

            involved_departments:
              departments.length >
              0
                ? departments
                : department
                ? [department]
                : [
                    "Municipal Department",
                  ],

            coordination_reason:
              typeof result.coordination_reason ===
                "string"
                ? result.coordination_reason
                : "AI coordination analysis completed.",

            action_plan:
              requiresCoordination
                ? actionPlan
                : [],

            coordination_source:
              "gemini",
          });
        } catch (error) {
          lastError =
            error;

          console.error(
            `Coordination Gemini attempt ${attempt} failed:`,
            error
          );

          if (
            attempt < 3
          ) {
            await wait(
              attempt * 1000
            );
          }
        }
      }

      console.error(
        "Gemini coordination unavailable:",
        lastError
      );

      // NEVER BLOCK REPORT
      return NextResponse.json(
        fallbackCoordination(
          description,
          category,
          department
        )
      );
    } catch (error) {
      console.error(
        "Gemini coordination error:",
        error
      );

      return NextResponse.json(
        fallbackCoordination(
          description,
          category,
          department
        )
      );
    }
  } catch (error) {
    console.error(
      "Coordination Route Error:",
      error
    );

    return NextResponse.json(
      {
        requires_coordination:
          false,

        primary_department:
          "Municipal Department",

        involved_departments:
          ["Municipal Department"],

        coordination_reason:
          "Coordination analysis could not be completed.",

        action_plan: [],

        coordination_source:
          "fallback",
      },
      {
        status: 200,
      }
    );
  }
}