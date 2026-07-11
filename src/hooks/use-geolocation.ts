"use client";

import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  permission: "granted" | "denied" | "prompt" | "loading";
  error: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    permission: "loading",
    error: null,
  });

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        permission: "denied",
        error: "Geolocation not supported",
      }));
      return;
    }

    setState((s) => ({ ...s, permission: "loading" }));

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          permission: "granted",
          error: null,
        });
      },
      (err) => {
        const permission =
          err.code === err.PERMISSION_DENIED ? "denied" : "prompt";
        setState((s) => ({
          ...s,
          permission,
          error: err.message,
        }));
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { ...state, retry: request };
}
