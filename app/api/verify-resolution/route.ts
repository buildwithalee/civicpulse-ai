import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/lib/supabase";
import sharp from "sharp";

type ImageData = {
  mimeType: string;
  data: string;
};

// =================================
// FAST IMAGE DOWNLOAD + COMPRESSION
// =================================

async function imageUrlToBase64(
  url: string
): Promise<ImageData> {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, 8000);

  try {
    const response =
      await fetch(url, {
        signal:
          controller.signal,
      });

    if (!response.ok) {
      throw new Error(
        `Image download failed: ${response.status}`
      );
    }

    const arrayBuffer =
      await response.arrayBuffer();

    const originalBuffer =
      Buffer.from(
        arrayBuffer
      );

    // Reduce image size for faster AI vision
    const optimizedBuffer =
      await sharp(
        originalBuffer
      )
        .rotate()
        .resize({
          width: 768,
          height: 768,
          fit: "inside",
          withoutEnlargement:
            true,
        })
        .jpeg({
          quality: 68,
        })
        .toBuffer();

    return {
      mimeType:
        "image/jpeg",

      data:
        optimizedBuffer.toString(
          "base64"
        ),
    };
  } finally {
    clearTimeout(
      timeout
    );
  }
}

// =================================
// AI TIMEOUT
// =================================

function withTimeout<T>(
  promise: Promise<T>,
  milliseconds: number
): Promise<T> {
  return Promise.race([
    promise,

    new Promise<T>(
      (_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                "AI verification timed out."
              )
            ),
          milliseconds
        );
      }
    ),
  ]);
}

// =================================
// POST
// =================================

export async function POST(
  request: Request
) {
  let complaintId = "";

  try {
    const body =
      await request.json();

    complaintId =
      typeof body.complaintId ===
      "string"
        ? body.complaintId
        : "";

    if (!complaintId) {
      return NextResponse.json(
        {
          error:
            "Complaint ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================
    // GET COMPLAINT
    // =================================

    const {
      data: complaint,
      error: fetchError,
    } =
      await supabase
        .from(
          "complaints"
        )
        .select(
          `
          id,
          description,
          category,
          priority,
          status,
          image_url,
          resolution_image_url
        `
        )
        .eq(
          "id",
          complaintId
        )
        .single();

    if (
      fetchError ||
      !complaint
    ) {
      return NextResponse.json(
        {
          error:
            "Complaint not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (
      !complaint
        .resolution_image_url
    ) {
      return NextResponse.json(
        {
          error:
            "Resolution image is required.",
        },
        {
          status: 400,
        }
      );
    }

    // =================================
    // REVIEWING STATE
    // =================================

    await supabase
      .from("complaints")
      .update({
        resolution_verification_status:
          "AI Reviewing",

        resolution_verified:
          false,

        resolution_confidence:
          null,

        resolution_reason:
          "AI is comparing the before and after evidence.",
      })
      .eq(
        "id",
        complaintId
      );

    const apiKey =
      process.env
        .GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "Gemini API key is missing."
      );
    }

    // =================================
    // OPTIMIZE AFTER IMAGE
    // =================================

    const afterImage =
      await imageUrlToBase64(
        complaint
          .resolution_image_url
      );

    // =================================
    // OPTIMIZE BEFORE IMAGE
    // =================================

    let beforeImage:
      | ImageData
      | null = null;

    if (
      complaint.image_url
    ) {
      try {
        beforeImage =
          await imageUrlToBase64(
            complaint
              .image_url
          );
      } catch (error) {
        console.error(
          "Before image optimization failed:",
          error
        );
      }
    }

    // =================================
    // GEMINI
    // =================================

    const ai =
      new GoogleGenAI({
        apiKey,
      });

    const prompt = `
You are CivicPulse AI's civic issue resolution verification agent.

Complaint:
${complaint.description}

Category:
${complaint.category || "Unknown"}

Compare the BEFORE and AFTER evidence.

Decide whether the reported civic problem appears visually resolved.

Use:

Verified
- clear visual evidence that the reported problem has been fixed.

Rejected
- the problem is still clearly visible.

Needs Review
- evidence is unclear, mismatched, insufficient, or uncertain.

Important:
- Judge only visible evidence.
- Do not assume work was completed.
- Same place and visibly corrected condition strongly support verification.
- confidence must be 0-100.
- Keep reason very short.

Return ONLY JSON:

{
  "status": "Verified",
  "confidence": 95,
  "reason": "The garbage visible in the before image is absent in the after image and the roadside is clean."
}
`;

    const parts: any[] =
      [
        {
          text: prompt,
        },
      ];

    if (beforeImage) {
      parts.push({
        text:
          "BEFORE IMAGE:",
      });

      parts.push({
        inlineData: {
          mimeType:
            beforeImage.mimeType,

          data:
            beforeImage.data,
        },
      });
    }

    parts.push({
      text:
        "AFTER IMAGE:",
    });

    parts.push({
      inlineData: {
        mimeType:
          afterImage.mimeType,

        data:
          afterImage.data,
      },
    });

    // =================================
    // MAX 20 SECOND AI WAIT
    // =================================

    const response =
      await withTimeout(
        ai.models.generateContent({
          model:
            "gemini-3.6-flash",

          contents: [
            {
              role: "user",
              parts,
            },
          ],
        }),

        20000
      );

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

    if (!cleanText) {
      throw new Error(
        "AI returned no result."
      );
    }

    const result =
      JSON.parse(
        cleanText
      );

    const allowedStatuses =
      [
        "Verified",
        "Rejected",
        "Needs Review",
      ];

    const status =
      allowedStatuses.includes(
        result.status
      )
        ? result.status
        : "Needs Review";

    const confidence =
      Math.min(
        100,
        Math.max(
          0,
          Number(
            result.confidence
          ) || 0
        )
      );

    const reason =
      result.reason ||
      "AI completed evidence review.";

    const verified =
      status ===
      "Verified";

    // =================================
    // SAVE RESULT
    // =================================

    const updateData: Record<
      string,
      unknown
    > = {
      resolution_verification_status:
        status,

      resolution_confidence:
        confidence,

      resolution_reason:
        reason,

      resolution_verified:
        verified,

      verified_at:
        verified
          ? new Date().toISOString()
          : null,
    };

    if (verified) {
      updateData.status =
        "Resolved";

      updateData.is_escalated =
        false;
    } else {
      updateData.status =
        "Awaiting Verification";
    }

    const {
      error: updateError,
    } =
      await supabase
        .from(
          "complaints"
        )
        .update(
          updateData
        )
        .eq(
          "id",
          complaintId
        );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    return NextResponse.json({
      success: true,
      status,
      confidence,
      reason,
      verified,
      compared_before_after:
        beforeImage !==
        null,
    });
  } catch (error) {
    console.error(
      "Fast Resolution Verification Error:",
      error
    );

    // Never leave it stuck at AI Reviewing
    if (complaintId) {
      await supabase
        .from(
          "complaints"
        )
        .update({
          resolution_verification_status:
            "Needs Review",

          resolution_confidence:
            0,

          resolution_verified:
            false,

          resolution_reason:
            error instanceof Error
              ? error.message
              : "AI verification could not be completed.",

          status:
            "Awaiting Verification",
        })
        .eq(
          "id",
          complaintId
        );
    }

    return NextResponse.json({
      success: true,

      status:
        "Needs Review",

      confidence: 0,

      reason:
        error instanceof Error
          ? error.message
          : "Verification unavailable.",

      verified:
        false,
    });
  }
}