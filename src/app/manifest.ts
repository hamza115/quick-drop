import type { MetadataRoute } from "next";

/** Lets phones install QuickDrop to the home screen and open it without browser chrome. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuickDrop",
    short_name: "QuickDrop",
    description: "Your personal space for files between devices",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9f9f9",
    theme_color: "#f9f9f9",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
