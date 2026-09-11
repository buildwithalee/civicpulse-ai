import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const complaintId =
      typeof body.complaintId === "string"
        ? body.complaintId
        : "";

    if (!complaintId) {
      return NextResponse.json(
        {
          error: "Complaint ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const { data: complaint, error: fetchError } =
      await supabase
        .from("complaints")
        .select(
          `
          id,
          resolution_image_url,
          status
        `
        )
        .eq("id", complaintId)
        .single();

    if (fetchError || !complaint) {
      return NextResponse.json(
        {
          error: "Complaint not found.",
        },
        {
          status: 404,
        }
      );
    }

    if (!complaint.resolution_image_url) {
      return NextResponse.json(
        {
          error:
            "Resolution evidence must be uploaded first.",
        },
        {
          status: 400,
        }
      );
    }

    const { error: updateError } =
      await supabase
        .from("complaints")
        .update({
          resolution_verification_status:
            "Manually Verified",

          resolution_confidence:
            null,

          resolution_reason:
            "Resolution evidence was reviewed and approved by the responsible authority after AI verification was unavailable.",

          resolution_verified:
            true,

          verified_at:
            new Date().toISOString(),

          status:
            "Resolved",

          is_escalated:
            false,
        })
        .eq(
          "id",
          complaintId
        );

    if (updateError) {
      return NextResponse.json(
        {
          error:
            updateError.message,
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      status:
        "Manually Verified",
      complaint_status:
        "Resolved",
    });
  } catch (error) {
    console.error(
      "Manual Verification Error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Manual verification failed.",
      },
      {
        status: 500,
      }
    );
  }
}