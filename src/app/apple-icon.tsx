import { ImageResponse } from "next/og";

// Home-screen icon for iPhone and iPad (PNG is required there).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111113",
        }}
      >
        <svg width="104" height="104" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 18a5 5 0 1 1 1.2-9.86A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z" />
          <path d="M12 10.5v5" />
          <path d="m9.75 13.5 2.25 2.25 2.25-2.25" />
        </svg>
      </div>
    ),
    size,
  );
}
