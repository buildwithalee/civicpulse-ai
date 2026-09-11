import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

type ExistingComplaint = {
  id: string;
  description: string;
  category?: string | null;
  location?: string | null;
  distance_km?: number | null;
  match_type?: string | null;
};

// =================================
// NORMALIZE SCORE
// =================================

function normalizeScore(
  value: unknown,
  fallback = 0
) {
  let score =
    Number(value);

  if (
    !Number.isFinite(
      score
    )
  ) {
    return fallback;
  }

  // 0.95 -> 95
  if (
    score > 0 &&
    score <= 1
  ) {
    score =
      score * 100;
  }

  return Math.round(
    Math.min(
      100,
      Math.max(
        0,
        score
      )
    )
  );
}

// =================================
// NORMALIZE TEXT
// =================================

const normalize = (
  value:
    | string
    | null
    | undefined
) => {
  return (
    value || ""
  )
    .toLowerCase()
    .replace(
      /[^\w\s]/g,
      " "
    )
    .replace(
      /\s+/g,
      " "
    )
    .trim();
};

// =================================
// TOKENIZE TEXT
// =================================

const getWords = (
  text: string
) => {
  const stopWords =
    new Set([
      "a",
      "an",
      "the",
      "is",
      "are",
      "was",
      "were",
      "has",
      "have",
      "had",
      "on",
      "in",
      "at",
      "of",
      "to",
      "for",
      "and",
      "or",
      "this",
      "that",
      "it",
      "there",
      "people",
      "very",
      "with",
      "from",
    ]);

  return normalize(
    text
  )
    .split(" ")
    .filter(
      (word) =>
        word.length >
          2 &&
        !stopWords.has(
          word
        )
    );
};

// =================================
// LOCAL TEXT SIMILARITY
// =================================

const similarityScore = (
  text1: string,
  text2: string
) => {
  const words1 =
    new Set(
      getWords(
        text1
      )
    );

  const words2 =
    new Set(
      getWords(
        text2
      )
    );

  if (
    words1.size === 0 ||
    words2.size === 0
  ) {
    return 0;
  }

  let common = 0;

  words1.forEach(
    (word) => {
      if (
        words2.has(
          word
        )
      ) {
        common++;
      }
    }
  );

  const smallerSize =
    Math.min(
      words1.size,
      words2.size
    );

  if (
    smallerSize === 0
  ) {
    return 0;
  }

  return (
    common /
    smallerSize
  );
};

// =================================
// POST
// =================================

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

    const location =
      typeof body.location ===
        "string"
        ? body.location.trim()
        : "";

    const nearbyComplaints =
      Array.isArray(
        body.nearbyComplaints
      )
        ? body.nearbyComplaints
        : [];

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

    // =================================
    // NO CANDIDATES
    // =================================

    if (
      nearbyComplaints.length ===
      0
    ) {
      return NextResponse.json({
        is_duplicate:
          false,

        duplicate_of:
          null,

        confidence: 0,

        reason:
          "No nearby or same-location reports were found.",
      });
    }

    // =================================
    // LOCAL DETERMINISTIC CHECK
    // =================================

    const newLocation =
      normalize(
        location
      );

    const newCategory =
      normalize(
        category
      );

    let strongestCandidate:
      | {
          complaint:
            ExistingComplaint;
          similarity:
            number;
        }
      | null = null;

    for (
      const complaint of
        nearbyComplaints as ExistingComplaint[]
    ) {
      const existingLocation =
        normalize(
          complaint.location
        );

      const existingCategory =
        normalize(
          complaint.category
        );

      const sameLocation =
        newLocation.length >
          0 &&
        existingLocation.length >
          0 &&
        newLocation ===
          existingLocation;

      const sameCategory =
        newCategory.length >
          0 &&
        existingCategory.length >
          0 &&
        newCategory ===
          existingCategory;

      const gpsNearby =
        complaint.match_type ===
          "GPS_NEARBY" ||
        (
          typeof complaint.distance_km ===
            "number" &&
          complaint.distance_km <=
            1
        );

      const similarity =
        similarityScore(
          description,
          complaint.description ||
            ""
        );

      console.log(
        "Duplicate candidate:",
        {
          id:
            complaint.id,
          sameLocation,
          sameCategory,
          gpsNearby,
          similarity,
        }
      );

      if (
        (
          sameLocation ||
          gpsNearby
        ) &&
        sameCategory &&
        similarity >=
          0.35
      ) {
        if (
          !strongestCandidate ||
          similarity >
            strongestCandidate.similarity
        ) {
          strongestCandidate =
            {
              complaint,
              similarity,
            };
        }
      }
    }

    // =================================
    // STRONG LOCAL MATCH
    // =================================

    if (
      strongestCandidate
    ) {
      const confidence =
        normalizeScore(
          75 +
            strongestCandidate.similarity *
              23,
          80
        );

      return NextResponse.json({
        is_duplicate:
          true,

        duplicate_of:
          strongestCandidate
            .complaint.id,

        confidence,

        reason:
          "Same location, same category and strongly similar incident description were detected.",
      });
    }

    // =================================
    // GEMINI CHECK
    // =================================

    const apiKey =
      process.env
        .GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        is_duplicate:
          false,

        duplicate_of:
          null,

        confidence: 0,

        reason:
          "No strong deterministic duplicate was found.",
      });
    }

    try {
      const ai =
        new GoogleGenAI({
          apiKey,
        });

      const response =
        await ai.models.generateContent({
          model:
            "gemini-3.6-flash",

          contents: `
You are CivicPulse AI's duplicate incident detection agent.

Your task is to determine whether the NEW REPORT describes the SAME REAL-WORLD CIVIC INCIDENT as one of the EXISTING REPORTS.

NEW REPORT:

Description:
${description}

Category:
${category || "Unknown"}

Location:
${location || "Unknown"}

EXISTING REPORTS:

${JSON.stringify(
  nearbyComplaints,
  null,
  2
)}

Important example:

Existing:
"Large garbage pile is covering the roadside near homes."

New:
"Waste and trash have accumulated along the road and are creating an unhealthy environment."

If both refer to the same location and same physical garbage pile, they may be duplicates even though the wording differs.

Another example:

Existing:
"A live electric wire has fallen across the road."

New:
"An electrical cable is lying on the street and blocking traffic."

If location and physical incident match, treat them as the same incident.

RULES:

1. Compare meaning, not exact wording.
2. Same location supports a duplicate decision.
3. Same category supports a duplicate decision.
4. Same specific physical incident is the strongest evidence.
5. GPS-nearby reports are strong evidence.
6. Do NOT mark unrelated incidents duplicate just because they share the same city.
7. duplicate_of MUST be one of the supplied report IDs.
8. confidence MUST be a percentage from 0 to 100.
9. Prefer integer confidence such as 92, not 0.92.

Return ONLY valid JSON:

{
  "is_duplicate": true,
  "duplicate_of": "UUID or null",
  "confidence": 90,
  "reason": "short explanation"
}
`,
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
          "Gemini returned empty duplicate result."
        );
      }

      const result =
        JSON.parse(
          cleanText
        );

      const validId =
        nearbyComplaints.some(
          (
            complaint:
              ExistingComplaint
          ) =>
            complaint.id ===
            result.duplicate_of
        );

      // =================================
      // DUPLICATE TRUE
      // =================================

      if (
        result.is_duplicate ===
          true &&
        validId
      ) {
        return NextResponse.json({
          is_duplicate:
            true,

          duplicate_of:
            result.duplicate_of,

          // IMPORTANT:
          // Always integer
          confidence:
            normalizeScore(
              result.confidence,
              80
            ),

          reason:
            typeof result.reason ===
              "string"
              ? result.reason
              : "AI identified a matching incident.",
        });
      }

      // =================================
      // DUPLICATE FALSE
      // =================================

      return NextResponse.json({
        is_duplicate:
          false,

        duplicate_of:
          null,

        // IMPORTANT:
        // Always integer
        confidence:
          normalizeScore(
            result.confidence,
            0
          ),

        reason:
          typeof result.reason ===
            "string"
            ? result.reason
            : "No matching incident was found.",
      });
    } catch (
      geminiError
    ) {
      console.error(
        "Duplicate Gemini Error:",
        geminiError
      );

      // Duplicate failure should never
      // block report submission.
      return NextResponse.json({
        is_duplicate:
          false,

        duplicate_of:
          null,

        confidence: 0,

        reason:
          "AI duplicate check temporarily unavailable.",
      });
    }
  } catch (error) {
    console.error(
      "Duplicate Detection Error:",
      error
    );

    // Even unexpected duplicate error
    // should not block complaint submission.
    return NextResponse.json({
      is_duplicate:
        false,

      duplicate_of:
        null,

      confidence: 0,

      reason:
        "Duplicate detection could not be completed.",
    });
  }
}