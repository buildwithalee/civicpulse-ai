import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      description,
      category,
      priority,
      department,
      location,
    } = body;

    if (!description) {
      return NextResponse.json(
        {
          error: "Description is required.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey =
      process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "Gemini API key missing.",
        },
        {
          status: 500,
        }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
    });

    const prompt = `
You are the Multi-Department Coordination Agent for CivicPulse AI.

Analyze this civic complaint and determine whether multiple government departments need to work together.

COMPLAINT

Description:
${description}

Category:
${category || "Unknown"}

Priority:
${priority || "Unknown"}

Initially Assigned Department:
${department || "Unknown"}

Location:
${location || "Unknown"}

Example:

A live electric wire has fallen on a road and is blocking traffic.

Possible coordination:
1. Electricity Department — disconnect power and remove electrical danger.
2. Traffic Police — secure the area and divert traffic.
3. Road Department — clear obstruction or repair road after electrical danger is removed.

If only one department is required, do not invent extra departments.

Return ONLY valid JSON:

{
  "requires_coordination": true,
  "primary_department": "",
  "involved_departments": [],
  "coordination_reason": "",
  "action_plan": [
    {
      "step": 1,
      "department": "",
      "action": "",
      "depends_on": null
    }
  ]
}

RULES:

1. Multiple departments only when genuinely required.
2. Critical public safety actions must come first.
3. involved_departments must contain required departments.
4. If one department is sufficient, requires_coordination must be false.
5. action_plan must follow safe logical order.
6. depends_on should contain previous step number when required.
`;

    let response;
    let lastError: unknown;

    // Retry Gemini automatically up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(
          `Coordination AI attempt ${attempt}/3`
        );

        response =
          await ai.models.generateContent({
            model: "gemini-3.6-flash",
            contents: prompt,
          });

        break;
      } catch (error) {
        lastError = error;

        console.error(
          `Gemini attempt ${attempt} failed:`,
          error
        );

        if (attempt < 3) {
          // 2 sec -> 4 sec delay
          await wait(attempt * 2000);
        }
      }
    }

    if (!response) {
      throw lastError ||
        new Error(
          "Gemini coordination service unavailable."
        );
    }

    const cleanText = (
      response.text || ""
    )
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    const result =
      JSON.parse(cleanText);

    return NextResponse.json({
      requires_coordination:
        result.requires_coordination === true,

      primary_department:
        result.primary_department ||
        department ||
        "Unknown",

      involved_departments:
        Array.isArray(
          result.involved_departments
        )
          ? result.involved_departments
          : [],

      coordination_reason:
        result.coordination_reason ||
        "Coordination analysis completed.",

      action_plan:
        Array.isArray(result.action_plan)
          ? result.action_plan
          : [],
    });
  } catch (error) {
    console.error(
      "Coordination Agent Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Coordination analysis failed.",
      },
      {
        status: 503,
      }
    );
  }
}