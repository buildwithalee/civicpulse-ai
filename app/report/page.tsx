"use client";

import {
  useRef,
  useState,
  type FormEvent,
} from "react";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ActionPlanStep = {
  step: number;
  department: string;
  action: string;
  depends_on: number | null;
};

export default function ReportPage() {
  const [description, setDescription] =
    useState("");

  const [location, setLocation] =
    useState("");

  const [imageFile, setImageFile] =
    useState<File | null>(null);

  const [
    imagePreview,
    setImagePreview,
  ] = useState<string | null>(null);

  const [
    isRecording,
    setIsRecording,
  ] = useState(false);

  const [audioUrl, setAudioUrl] =
    useState<string | null>(null);

  const [audioBlob, setAudioBlob] =
    useState<Blob | null>(null);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    submitStatus,
    setSubmitStatus,
  ] = useState("");

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const audioChunksRef =
    useRef<Blob[]>([]);

  // =================================
  // DETECT GPS LOCATION
  // =================================

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert(
        "Location is not supported by your browser."
      );

      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(
          `${position.coords.latitude}, ${position.coords.longitude}`
        );
      },

      () => {
        alert(
          "Unable to detect location. Please allow location permission."
        );
      }
    );
  };

  // =================================
  // IMAGE
  // =================================

  const handleImage = (
    file?: File
  ) => {
    if (!file) return;

    setImageFile(file);

    const preview =
      URL.createObjectURL(file);

    setImagePreview(preview);
  };

  // =================================
  // VOICE RECORDING
  // =================================

  const startRecording =
    async () => {
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            {
              audio: true,
            }
          );

        const recorder =
          new MediaRecorder(stream);

        audioChunksRef.current = [];

        recorder.ondataavailable = (
          event
        ) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(
              event.data
            );
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(
            audioChunksRef.current,
            {
              type: "audio/webm",
            }
          );

          setAudioBlob(blob);

          const url =
            URL.createObjectURL(blob);

          setAudioUrl(url);

          stream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );
        };

        recorder.start();

        mediaRecorderRef.current =
          recorder;

        setIsRecording(true);
      } catch {
        alert(
          "Microphone permission is required."
        );
      }
    };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();

    setIsRecording(false);
  };

  // =================================
  // UPLOAD IMAGE
  // =================================

  const uploadImage = async () => {
    if (!imageFile) return null;

    const extension =
      imageFile.name
        .split(".")
        .pop()
        ?.toLowerCase() || "jpg";

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.${extension}`;

    const { error } =
      await supabase.storage
        .from("issue-images")
        .upload(
          fileName,
          imageFile
        );

    if (error) {
      throw new Error(
        "Image upload failed: " +
          error.message
      );
    }

    const { data } =
      supabase.storage
        .from("issue-images")
        .getPublicUrl(fileName);

    return data.publicUrl;
  };

  // =================================
  // UPLOAD VOICE
  // =================================

  const uploadVoice = async () => {
    if (!audioBlob) return null;

    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2)}.webm`;

    const { error } =
      await supabase.storage
        .from("voice-reports")
        .upload(
          fileName,
          audioBlob,
          {
            contentType:
              "audio/webm",
          }
        );

    if (error) {
      throw new Error(
        "Voice upload failed: " +
          error.message
      );
    }

    const { data } =
      supabase.storage
        .from("voice-reports")
        .getPublicUrl(fileName);

    return data.publicUrl;
  };

  // =================================
  // DISTANCE CALCULATOR
  // =================================

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const earthRadius = 6371;

    const dLat =
      ((lat2 - lat1) *
        Math.PI) /
      180;

    const dLon =
      ((lon2 - lon1) *
        Math.PI) /
      180;

    const a =
      Math.sin(dLat / 2) *
        Math.sin(dLat / 2) +
      Math.cos(
        (lat1 * Math.PI) /
          180
      ) *
        Math.cos(
          (lat2 * Math.PI) /
            180
        ) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );

    return earthRadius * c;
  };

  // =================================
  // NORMALIZE LOCATION
  // Dadu / dadu / DADU => dadu
  // =================================

  const normalizeLocation = (
    value: string | null
  ) => {
    if (!value) return "";

    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, " ");
  };

  // =================================
  // SUBMIT REPORT
  // =================================

  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (!description.trim()) {
      alert(
        "Please describe the issue."
      );

      return;
    }

    setIsSubmitting(true);

    try {
      // =============================
      // 1. MAIN GEMINI AI AGENT
      // =============================

      setSubmitStatus(
        "AI is analyzing your report..."
      );

      const aiResponse =
        await fetch(
          "/api/analyze",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              description:
                description.trim(),

              location:
                location ||
                "Unknown",
            }),
          }
        );

      if (!aiResponse.ok) {
        const aiError =
          await aiResponse
            .json()
            .catch(() => null);

        throw new Error(
          aiError?.error ||
            "AI analysis failed."
        );
      }

      const aiResult =
        await aiResponse.json();

      console.log(
        "Main AI Result:",
        aiResult
      );

      // =============================
      // 2. MULTI-DEPARTMENT
      // COORDINATION AGENT
      // =============================

      setSubmitStatus(
        "AI is creating department action plan..."
      );

      let coordinationResult = {
        requires_coordination: false,

        primary_department:
          aiResult.department,

        involved_departments: [
          aiResult.department,
        ] as string[],

        coordination_reason:
          "Single department response is sufficient.",

        action_plan:
          [] as ActionPlanStep[],
      };

      try {
        const coordinationResponse =
          await fetch(
            "/api/coordinate",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  description:
                    description.trim(),

                  category:
                    aiResult.category,

                  priority:
                    aiResult.priority,

                  department:
                    aiResult.department,

                  location:
                    location ||
                    "Unknown",
                }),
            }
          );

        if (
          coordinationResponse.ok
        ) {
          const result =
            await coordinationResponse.json();

          coordinationResult = {
            requires_coordination:
              result.requires_coordination ===
              true,

            primary_department:
              result.primary_department ||
              aiResult.department,

            involved_departments:
              Array.isArray(
                result.involved_departments
              ) &&
              result
                .involved_departments
                .length > 0
                ? result.involved_departments
                : [
                    aiResult.department,
                  ],

            coordination_reason:
              result.coordination_reason ||
              "Coordination analysis completed.",

            action_plan:
              Array.isArray(
                result.action_plan
              )
                ? result.action_plan
                : [],
          };
        } else {
          const coordinationError =
            await coordinationResponse
              .json()
              .catch(() => null);

          console.error(
            "Coordination API failed:",
            coordinationError
          );
        }
      } catch (
        coordinationError
      ) {
        console.error(
          "Coordination Agent Error:",
          coordinationError
        );
      }

      console.log(
        "Coordination Result:",
        coordinationResult
      );

      // =============================
      // 3. PARSE GPS
      // =============================

      let latitude:
        | number
        | null = null;

      let longitude:
        | number
        | null = null;

      if (location.includes(",")) {
        const [
          latRaw,
          lngRaw,
        ] = location
          .split(",")
          .map((value) =>
            value.trim()
          );

        const lat =
          Number(latRaw);

        const lng =
          Number(lngRaw);

        if (
          Number.isFinite(lat) &&
          Number.isFinite(lng)
        ) {
          latitude = lat;
          longitude = lng;
        }
      }

      // =============================
      // 4. LOAD EXISTING REPORTS
      // =============================

      setSubmitStatus(
        "Searching for similar reports..."
      );

      const {
        data: existingComplaints,
        error: existingError,
      } = await supabase
        .from("complaints")
        .select(
          `
          id,
          description,
          category,
          priority,
          status,
          location,
          latitude,
          longitude
          `
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(100);

      if (existingError) {
        console.error(
          "Existing complaint search error:",
          existingError
        );
      }

      let duplicateCandidates:
        any[] = [];

      const newLocation =
        normalizeLocation(location);

      if (existingComplaints) {
        duplicateCandidates =
          existingComplaints
            .map((complaint) => {
              let distanceKm:
                | number
                | null = null;

              let matchType = "";

              // -------------------------
              // GPS NEARBY MATCH
              // -------------------------

              if (
                latitude !== null &&
                longitude !== null &&
                complaint.latitude !==
                  null &&
                complaint.longitude !==
                  null
              ) {
                distanceKm =
                  calculateDistance(
                    latitude,
                    longitude,
                    Number(
                      complaint.latitude
                    ),
                    Number(
                      complaint.longitude
                    )
                  );

                if (
                  distanceKm <= 1
                ) {
                  matchType =
                    "GPS_NEARBY";
                }
              }

              // -------------------------
              // SAME TEXT LOCATION
              // -------------------------

              const existingLocation =
                normalizeLocation(
                  complaint.location
                );

              if (
                !matchType &&
                newLocation &&
                existingLocation &&
                newLocation ===
                  existingLocation
              ) {
                matchType =
                  "SAME_LOCATION_TEXT";
              }

              return {
                id:
                  complaint.id,

                description:
                  complaint.description,

                category:
                  complaint.category,

                priority:
                  complaint.priority,

                status:
                  complaint.status,

                location:
                  complaint.location,

                distance_km:
                  distanceKm !== null
                    ? Number(
                        distanceKm.toFixed(
                          3
                        )
                      )
                    : null,

                match_type:
                  matchType,
              };
            })
            .filter(
              (complaint) =>
                complaint.match_type !==
                ""
            )
            .slice(0, 10);
      }

      console.log(
        "Duplicate Candidates:",
        duplicateCandidates
      );

      // =============================
      // 5. DUPLICATE AI AGENT
      // =============================

      setSubmitStatus(
        "AI is checking for duplicate complaints..."
      );

      let duplicateResult = {
        is_duplicate: false,

        duplicate_of:
          null as string | null,

        confidence: 0,

        reason:
          "No duplicate detected.",
      };

      if (
        duplicateCandidates.length >
        0
      ) {
        try {
          const duplicateResponse =
            await fetch(
              "/api/check-duplicate",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    description:
                      description.trim(),

                    category:
                      aiResult.category,

                    location:
                      location ||
                      "Unknown",

                    nearbyComplaints:
                      duplicateCandidates,
                  }),
              }
            );

          if (
            duplicateResponse.ok
          ) {
            const result =
              await duplicateResponse.json();

            const validDuplicate =
              duplicateCandidates.some(
                (complaint) =>
                  complaint.id ===
                  result.duplicate_of
              );

            duplicateResult = {
              is_duplicate:
                result.is_duplicate ===
                  true &&
                validDuplicate,

              duplicate_of:
                result.is_duplicate ===
                  true &&
                validDuplicate
                  ? result.duplicate_of
                  : null,

              confidence:
                Math.min(
                  100,
                  Math.max(
                    0,
                    Number(
                      result.confidence
                    ) || 0
                  )
                ),

              reason:
                result.reason ||
                "Duplicate analysis completed.",
            };
          } else {
            const duplicateError =
              await duplicateResponse
                .json()
                .catch(() => null);

            console.error(
              "Duplicate API failed:",
              duplicateError
            );
          }
        } catch (
          duplicateError
        ) {
          console.error(
            "Duplicate check failed:",
            duplicateError
          );
        }
      }

      console.log(
        "Duplicate Result:",
        duplicateResult
      );

      // =============================
      // 6. UPLOAD EVIDENCE
      // =============================

      setSubmitStatus(
        "Uploading evidence..."
      );

      const imageUrl =
        await uploadImage();

      const voiceUrl =
        await uploadVoice();

      // =============================
      // 7. SAVE EVERYTHING
      // TO SUPABASE
      // =============================

      setSubmitStatus(
        "Saving AI action plan..."
      );

      const { data, error } =
        await supabase
          .from("complaints")
          .insert([
            {
              // Citizen Report
              description:
                description.trim(),

              location:
                location || null,

              latitude,
              longitude,

              image_url:
                imageUrl,

              voice_url:
                voiceUrl,

              // Main AI Agent
              category:
                aiResult.category,

              priority:
                aiResult.priority,

              trust_score:
                aiResult.trust_score,

              department:
                aiResult.department,

              // Duplicate Agent
              is_duplicate:
                duplicateResult.is_duplicate,

              duplicate_of:
                duplicateResult.duplicate_of,

              duplicate_confidence:
                duplicateResult.confidence,

              duplicate_reason:
                duplicateResult.reason,

              // Multi-Department Agent
              requires_coordination:
                coordinationResult.requires_coordination,

              involved_departments:
                coordinationResult.involved_departments,

              coordination_reason:
                coordinationResult.coordination_reason,

              action_plan:
                coordinationResult.action_plan,

              status:
                "Reported",
            },
          ])
          .select()
          .single();

      if (error) {
        throw new Error(
          error.message
        );
      }

      // =============================
      // 8. SUCCESS POPUP
      // =============================

      let duplicateMessage =
        "Duplicate: NO";

      if (
        duplicateResult.is_duplicate
      ) {
        duplicateMessage = `Duplicate: YES
Duplicate Confidence: ${duplicateResult.confidence}%
Original Report ID:
${duplicateResult.duplicate_of}

Duplicate Reason:
${duplicateResult.reason}`;
      }

      let coordinationMessage =
        `Multi-Department Coordination: NO

Department:
${aiResult.department}`;

      if (
        coordinationResult.requires_coordination
      ) {
        coordinationMessage =
          `Multi-Department Coordination: YES

Departments:
${coordinationResult.involved_departments.join(
  ", "
)}

Reason:
${coordinationResult.coordination_reason}`;
      }

      alert(
        `Report submitted successfully!

Category: ${aiResult.category}
Priority: ${aiResult.priority}
Department: ${aiResult.department}
Trust Score: ${aiResult.trust_score}%

${duplicateMessage}

${coordinationMessage}

Report ID:
${data.id}`
      );

      // =============================
      // 9. CLEAR FORM
      // =============================

      setDescription("");
      setLocation("");

      setImageFile(null);
      setImagePreview(null);

      setAudioBlob(null);
      setAudioUrl(null);
    } catch (error) {
      console.error(
        "Report Submission Error:",
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong.";

      alert(
        "Failed to submit report: " +
          message
      );
    } finally {
      setIsSubmitting(false);
      setSubmitStatus("");
    }
  };

  // =================================
  // PAGE UI
  // =================================

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}

      <nav className="border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/">
            <h1 className="text-xl font-bold">
              Civic
              <span className="text-cyan-400">
                Pulse AI
              </span>
            </h1>
          </Link>

          <Link
            href="/"
            className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
          >
            ← Home
          </Link>
        </div>
      </nav>

      {/* Report Section */}

      <section className="mx-auto max-w-3xl px-6 py-14">
        <div className="mb-10">
          <p className="text-sm font-semibold text-cyan-400">
            REPORT A CIVIC ISSUE
          </p>

          <h2 className="mt-2 text-4xl font-bold">
            Tell us what happened.
          </h2>

          <p className="mt-3 text-slate-400">
            Submit a photo, voice note,
            text and location. CivicPulse
            AI will analyze, prioritize,
            detect duplicates and create
            a department action plan.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-7 rounded-3xl border border-white/10 bg-white/[0.03] p-7"
        >
          {/* Description */}

          <div>
            <label className="mb-2 block font-medium">
              Describe the Issue
            </label>

            <textarea
              required
              value={description}
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Example: A dangerous electric wire has fallen across the road and is blocking traffic..."
              className="min-h-32 w-full resize-none rounded-xl border border-white/10 bg-slate-900 p-4 outline-none focus:border-cyan-400"
            />
          </div>

          {/* Image */}

          <div>
            <label className="mb-2 block font-medium">
              Upload Photo
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleImage(
                  e.target.files?.[0]
                )
              }
              className="w-full rounded-xl border border-white/10 bg-slate-900 p-4"
            />

            {imagePreview && (
              <img
                src={imagePreview}
                alt="Issue Preview"
                className="mt-4 max-h-72 w-full rounded-xl object-cover"
              />
            )}
          </div>

          {/* Voice */}

          <div>
            <label className="mb-2 block font-medium">
              Voice Report
            </label>

            {!isRecording ? (
              <button
                type="button"
                onClick={
                  startRecording
                }
                className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-3 text-cyan-300"
              >
                🎙️ Start Recording
              </button>
            ) : (
              <button
                type="button"
                onClick={
                  stopRecording
                }
                className="rounded-xl bg-red-500 px-5 py-3 font-medium"
              >
                ⏹ Stop Recording
              </button>
            )}

            {isRecording && (
              <p className="mt-3 text-sm text-red-400">
                🔴 Recording...
              </p>
            )}

            {audioUrl && (
              <audio
                controls
                src={audioUrl}
                className="mt-4 w-full"
              />
            )}
          </div>

          {/* Location */}

          <div>
            <label className="mb-2 block font-medium">
              Location
            </label>

            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={location}
                onChange={(e) =>
                  setLocation(
                    e.target.value
                  )
                }
                placeholder="Example: Dadu"
                className="flex-1 rounded-xl border border-white/10 bg-slate-900 p-4 outline-none focus:border-cyan-400"
              />

              <button
                type="button"
                onClick={
                  getLocation
                }
                className="rounded-xl border border-white/10 px-5 py-3 hover:bg-white/5"
              >
                📍 Detect Location
              </button>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              You can enter a city such
              as Dadu or use GPS.
            </p>
          </div>

          {/* AI Notice */}

          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-slate-300">
            🤖 CivicPulse AI will classify
            the issue, calculate priority,
            estimate report credibility,
            check for duplicate complaints
            and automatically create a
            multi-department action plan
            when required.
          </div>

          {/* Status */}

          {submitStatus && (
            <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3 text-center">
              <p className="text-sm font-medium text-cyan-400">
                {submitStatus}
              </p>
            </div>
          )}

          {/* Submit */}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-cyan-400 py-4 font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "AI Agents Processing..."
              : "Analyze & Submit Report →"}
          </button>
        </form>
      </section>
    </main>
  );
}