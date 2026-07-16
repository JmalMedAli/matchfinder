"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Navigation } from "lucide-react";
import "leaflet/dist/leaflet.css";

interface MapMatch {
  id: string;
  title: string;
  date: string;
  max_players: number;
  accepted_count: number;
  lat: number;
  lng: number;
  field_name: string;
  city: string;
  position_needed: string | null;
  status: string;
}

const createIcon = (status: string) => {
  const color = status === "OPEN" ? "#16A34A" : status === "FULL" ? "#F59E0B" : "#6B7280";
  return L.divIcon({
    className: "",
    html: `<div style="width:32px;height:32px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

interface MatchMapViewProps {
  center?: [number, number];
  matches: MapMatch[];
}

export function MatchMapView({ center = [36.7538, 10.185], matches }: MatchMapViewProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="h-[400px] rounded-2xl bg-muted animate-pulse" />;

  return (
    <div className="rounded-2xl overflow-hidden border h-[400px]">
      <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {matches.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={createIcon(m.status)}>
            <Popup>
              <div className="min-w-[180px] space-y-1">
                <p className="font-semibold text-sm">{m.title}</p>
                <p className="text-xs text-gray-500">{m.field_name} - {m.city}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                  {new Date(m.date).toLocaleDateString("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Users className="h-3 w-3" />
                  {m.accepted_count}/{m.max_players} players
                </div>
                {m.position_needed && <p className="text-xs text-green-600 font-medium">{m.position_needed} needed</p>}
                <Link href={`/dashboard/matches/${m.id}`}>
                  <Button size="sm" className="w-full mt-1 h-7 text-xs">View Match</Button>
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
