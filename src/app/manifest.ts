import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MatchFinder — Find Your Next Match",
    short_name: "MatchFinder",
    description: "Connect with football match organizers and players near you",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0e14",
    theme_color: "#16a34a",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png" },
      { src: "/icons/512", sizes: "512x512", type: "image/png" },
    ],
  };
}
