"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { supabase } from "@/lib/supabase";

type Complaint = {
  id: string;
  description: string;
  category: string | null;
  priority: string | null;
  department: string | null;
  status: string | null;
  trust_score: number | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
};

function FitMap({
  complaints,
}: {
  complaints: Complaint[];
}) {
  const map = useMap();

  useEffect(() => {
    const points = complaints
      .filter(
        (item) =>
          item.latitude !== null &&
          item.longitude !== null
      )
      .map(
        (item) =>
          [
            item.latitude as number,
            item.longitude as number,
          ] as [number, number]
      );

    if (points.length === 1) {
      map.setView(points[0], 15);
    }

    if (points.length > 1) {
      map.fitBounds(points, {
        padding: [40, 40],
      });
    }
  }, [complaints, map]);

  return null;
}

export default function MapClient() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("complaints")
      .select(
        "id, description, category, priority, department, status, trust_score, latitude, longitude, created_at"
      )
      .not("latitude", "is", null)
      .not("longitude", "is", null)
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      console.error("Map complaints error:", error);
    } else {
      setComplaints(data || []);
    }

    setLoading(false);
  };

  const markerIcon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `
          <div style="
            width:22px;
            height:22px;
            background:#22d3ee;
            border:4px solid white;
            border-radius:50%;
            box-shadow:0 0 0 4px rgba(34,211,238,.25);
          "></div>
        `,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      }),
    []
  );

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03]">
        <p className="text-slate-400">
          Loading live complaint map...
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          Reports with location:
          <span className="ml-2 font-semibold text-cyan-400">
            {complaints.length}
          </span>
        </p>

        <button
          onClick={loadComplaints}
          className="rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/5"
        >
          ↻ Refresh Map
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10">
        <MapContainer
          center={[24.8607, 67.0011]}
          zoom={12}
          scrollWheelZoom
          style={{
            height: "600px",
            width: "100%",
          }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <FitMap complaints={complaints} />

          {complaints.map((complaint) => {
            if (
              complaint.latitude === null ||
              complaint.longitude === null
            ) {
              return null;
            }

            return (
              <Marker
                key={complaint.id}
                position={[
                  complaint.latitude,
                  complaint.longitude,
                ]}
                icon={markerIcon}
              >
                <Popup>
                  <div style={{ minWidth: "220px" }}>
                    <strong>
                      {complaint.category ||
                        "Civic Issue"}
                    </strong>

                    <p
                      style={{
                        marginTop: "8px",
                        marginBottom: "8px",
                      }}
                    >
                      {complaint.description}
                    </p>

                    <p>
                      <strong>Priority:</strong>{" "}
                      {complaint.priority || "Pending"}
                    </p>

                    <p>
                      <strong>Status:</strong>{" "}
                      {complaint.status || "Reported"}
                    </p>

                    <p>
                      <strong>Department:</strong>{" "}
                      {complaint.department ||
                        "Not Assigned"}
                    </p>

                    <p>
                      <strong>Trust:</strong>{" "}
                      {complaint.trust_score !== null
                        ? `${complaint.trust_score}%`
                        : "Pending"}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {complaints.length === 0 && (
        <div className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm text-yellow-200">
          Abhi kisi complaint mein valid coordinates nahi hain.
          Report page se “Detect Location” use karke new complaint submit karo.
        </div>
      )}
    </div>
  );
}