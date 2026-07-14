"use client";

import { useEffect, useRef } from "react";
import type { FieldListItem } from "@/hooks/use-football-fields";

interface FieldMapViewProps {
  fields: FieldListItem[];
  userLocation?: { lat: number; lng: number } | null;
  onFieldClick?: (fieldId: string) => void;
}

export function FieldMapView({ fields, userLocation, onFieldClick }: FieldMapViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    async function initMap() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const center: [number, number] = userLocation
        ? [userLocation.lat, userLocation.lng]
        : [36.8065, 10.1815];

      const map = L.map(mapRef.current!, {
        center,
        zoom: 13,
        zoomControl: false,
      });

      L.control.zoom({ position: "topright" }).addTo(map);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19,
      }).addTo(map);

      const fieldIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:32px;height:32px;border-radius:50%;background:#16A34A;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
          </svg>
        </div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userIcon = L.divIcon({
        className: "custom-marker",
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)"/>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      if (userLocation) {
        L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
          .addTo(map)
          .bindPopup("You are here");
      }

      fields.forEach((field) => {
        if (field.latitude && field.longitude) {
          const marker = L.marker([field.latitude, field.longitude], { icon: fieldIcon })
            .addTo(map)
            .bindPopup(
              `<div style="min-width:160px">
                <p style="font-weight:600;font-size:14px;margin:0">${field.name}</p>
                <p style="font-size:12px;color:#666;margin:2px 0">${field.city}</p>
                <p style="font-size:12px;margin:2px 0">${field.match_count} match${field.match_count !== 1 ? "es" : ""} available</p>
              </div>`,
            );
          marker.on("click", () => {
            if (onFieldClick) onFieldClick(field.id);
          });
        }
      });

      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  }, [fields, userLocation, onFieldClick]);

  return <div ref={mapRef} className="w-full h-full min-h-[300px]" />;
}
