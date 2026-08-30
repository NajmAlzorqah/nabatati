import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const ACCENT = "#15803d";
const SURFACE = "#059669";
const BACKGROUND = "#020817";

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
          background: `linear-gradient(135deg, ${SURFACE} 0%, ${ACCENT} 100%)`,
        }}
      >
        <div
          style={{
            width: 120,
            height: 120,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: BACKGROUND,
            borderRadius: 9999,
          }}
        >
          <svg width={62} height={62} viewBox="0 0 24 24" fill="none">
            <path
              d="M20 4C14 4 7 7 5 12c-2 5 0 9 0 9s4-2 7-2c6 0 9-6 9-10 0-4-1-5-1-5Z"
              fill="#ffffff"
            />
            <path d="M19 5 12 12" stroke={ACCENT} stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </div>
      </div>
    ),
    { ...size },
  );
}
