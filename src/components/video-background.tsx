"use client";

import { useRef, useEffect, useState } from "react";

interface VideoBackgroundProps {
  videoSrc: string;
  posterSrc?: string;
  className?: string;
  overlayClassName?: string;
  children?: React.ReactNode;
}

export function VideoBackground({
  videoSrc,
  posterSrc,
  className = "",
  overlayClassName = "",
  children,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => setLoaded(true);
    video.addEventListener("canplay", handleCanPlay);

    video.play().catch(() => {
      // Autoplay blocked — silently ignore
    });

    return () => {
      video.removeEventListener("canplay", handleCanPlay);
    };
  }, []);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={posterSrc}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>

      <div
        className={`absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70 ${overlayClassName}`}
      />

      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
