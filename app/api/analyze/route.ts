import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// =================================
// NORMALIZE AI SCORE
// =================================
// Examples:
// 0.95  -> 95
// "0.8" -> 80
// 85.7  -> 86
// 120   -> 100

function normalizeScore(
  value: unknown,
  fallback = 70
) {
  let score = Number(value);

  if (!Number.isFinite(score)) {
    return fallback;
  }

  if (score > 0 && score <= 1) {
    score = score * 100;
  }

  return Math.round(
    Math.min(
      100,
      Math.max(0, score)
    )
  );
}

// =================================
// FALLBACK ANALYSIS
// =================================

function fallbackAnalysis(
  description: string
) {
  const text =
    description.toLowerCase();

  if (
    text.includes("electric") ||
    text.includes("wire") ||
    text.includes("cable") ||
    text.includes("pole") ||
    text.includes("shock") ||
    text.includes("transformer")
  ) {
    return {
      category:
        "Electrical Hazard",

      priority:
        "Critical",

      department:
        "Electricity Department",

      trust_score: 80,

      reason:
        "Electrical hazard indicators were detected in the complaint.",

      analysis_source:
        "fallback",

      route_version:
        "v4-integer-safe",
    };
  }

  if (
    text.includes("water") ||
    text.includes("sewer") ||
    text.includes("sewage") ||
    text.includes("drain") ||
    text.includes("leak") ||
    text.includes("overflow")
  ) {
    return {
      category:
        "Water / Sewer",

      priority:
        "High",

      department:
        "Water & Sewerage Department",

      trust_score: 75,

      reason:
        "Water or sewer infrastructure indicators were detected.",

      analysis_source:
        "fallback",

      route_version:
        "v4-integer-safe",
    };
  }

  if (
    text.includes("garbage") ||
    text.includes("trash") ||
    text.includes("waste") ||
    text.includes("rubbish") ||
    text.includes("dump") ||
    text.includes("litter")
  ) {
    return {
      category:
        "Garbage",

      priority:
        "Medium",

      department:
        "Waste Management Department",

      trust_score: 80,

      reason:
        "Waste management indicators were detected in the complaint.",

      analysis_source:
        "fallback",

      route_version:
        "v4-integer-safe",
    };
  }

  if (
    text.includes("pothole") ||
    text.includes("broken road") ||
    text.includes("damaged road") ||
    text.includes("road damage") ||
    text.includes("crack") ||
    text.includes("road")
  ) {
    return {
      category:
        "Road Damage",

      priority:
        "Medium",

      department:
        "Road Department",

      trust_score: 75,

      reason:
        "Road infrastructure indicators were detected in the complaint.",

      analysis_source:
        "fallback",

      route_version:
        "v4-integer-safe",
    };
  }

  return {
    category:
      "Other",

    priority:
      "Medium",

    department:
      "Municipal Department",

    trust_score: 65,

    reason:
      "The report requires general municipal review.",

    analysis_source:
      "fallback",

    route_version:
      "v4-integer-safe",
  };
}

// =================================
// POST
// =================================

export async function POST(
  request: Request
) {
  let description = "";
  let location = "Unknown";

  try {
    const body =
      await request.json();

    description =
      typeof body.description ===
        "string"
        ? body.description.trim()
        : "";

    location =
      typeof body.location ===
        "string" &&
      body.location.trim()
        ? body.location.trim()
        : "Unknown";

    if (!description) {
      return NextResponse.json(
        {
          error:
            "Description is required.",

          route_version:
            "v4-integer-safe",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn(
        "GEMINI_API_KEY missing. Using fallback."
      );

      return NextResponse.json(
        fallbackAnalysis(
          description
        )
      );
    }

    const ai =
      new GoogleGenAI({
        apiKey,
      });

    const prompt = `
You are CivicPulse AI's main civic complaint analysis agent.

Analyze this citizen complaint.

DESCRIPTION:
${description}

LOCATION:
${location}

Allowed categories:
- Garbage
- Road Damage
- Water / Sewer
- Electrical Hazard
- Other

Allowed priorities:
- Low
- Medium
- High
- Critical

Your tasks:

1. Select the best category.
2. Select the correct priority based on danger and public impact.
3. Select the primary responsible department.
4. Give a preliminary trust score.
5. Trust score represents plausibility and internal consistency only.
6. Do not claim the report is proven true.
7. Keep the reason short.

IMPORTANT:
trust_score MUST represent a percentage from 0 to 100.
Prefer an integer like 85, not 0.85.

Return ONLY valid JSON:

{
  "category": "",
  "priority": "",
  "department": "",
  "trust_score": 85,
  "reason": ""
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
        console.log(
          `Main AI attempt ${attempt}/3`
        );

        const response =
          await ai.models.generateContent({
            model:
              "gemini-3.6-flash",

            contents:
              prompt,
          });

        const cleanText = (
          response.text || ""
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

        console.log(
          "Gemini analysis:",
          cleanText
        );

        if (!cleanText) {
          throw new Error(
            "Gemini returned an empty response."
          );
        }

        const result =
          JSON.parse(
            cleanText
          );

        const allowedCategories =
          [
            "Garbage",
            "Road Damage",
            "Water / Sewer",
            "Electrical Hazard",
            "Other",
          ];

        const allowedPriorities =
          [
            "Low",
            "Medium",
            "High",
            "Critical",
          ];

        const category =
          allowedCategories.includes(
            result.category
          )
            ? result.category
            : "Other";

        const priority =
          allowedPriorities.includes(
            result.priority
          )
            ? result.priority
            : "Medium";

        // IMPORTANT FIX:
        // Always integer 0-100
        const trustScore =
          normalizeScore(
            result.trust_score,
            70
          );

        return NextResponse.json({
          category,

          priority,

          department:
            typeof result.department ===
              "string" &&
            result.department.trim()
              ? result.department.trim()
              : "Municipal Department",

          trust_score:
            trustScore,

          reason:
            typeof result.reason ===
              "string" &&
            result.reason.trim()
              ? result.reason.trim()
              : "Complaint analyzed successfully.",

          analysis_source:
            "gemini",

          route_version:
            "v4-integer-safe",
        });
      } catch (error) {
        lastError =
          error;

        console.error(
          `Gemini attempt ${attempt} failed:`,
          error
        );

        if (
          attempt < 3
        ) {
          await wait(
            attempt * 1200
          );
        }
      }
    }

    console.error(
      "Gemini unavailable:",
      lastError
    );

    return NextResponse.json(
      fallbackAnalysis(
        description
      )
    );
  } catch (error) {
    console.error(
      "Analyze Route Error:",
      error
    );

    if (description) {
      return NextResponse.json(
        fallbackAnalysis(
          description
        )
      );
    }

    return NextResponse.json(
      {
        error:
          "Invalid request data.",

        route_version:
          "v4-integer-safe",
      },
      {
        status: 400,
      }
    );
  }
}