import { ImageResponse } from "next/og";

export const contentType = "image/png";

const ACCENT = "#15803d";
const SURFACE = "#059669";
const BACKGROUND = "#020817";

type GeneratedImage = {
  id: string;
  size: { width: number; height: number };
  contentType: string;
};

export function generateImageMetadata(): GeneratedImage[] {
  return [
    { id: "192", size: { width: 192, height: 192 }, contentType: "image/png" },
    { id: "512", size: { width: 512, height: 512 }, contentType: "image/png" },
    {
      id: "maskable-512",
      size: { width: 512, height: 512 },
      contentType: "image/png",
    },
  ];
}

export default async function Icon({
  id,
}: {
  id: Promise<string | number>;
}) {
  const iconId = await id;

  // Maskable icons need a "safe zone": the visible glyph must sit within the
  // central ~80% so that platform masks (circles, rounded squares) never
  // crop it. Non-maskable glyphs may fill more of the canvas.
  const isMaskable = String(iconId) === "maskable-512";
  const safeScale = isMaskable ? 0.56 : 0.68;
  const glyphSize = Math.round(480 * safeScale);

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
            width: glyphSize,
            height: glyphSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: BACKGROUND,
            borderRadius: 9999,
          }}
        >
          {/* Stylized leaf */}
          <svg
            width={glyphSize * 0.52}
            height={glyphSize * 0.52}
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M20 4C14 4 7 7 5 12c-2 5 0 9 0 9s4-2 7-2c6 0 9-6 9-10 0-4-1-5-1-5Z"
              fill="#ffffff"
            />
            <path d="M19 5 12 12" stroke={ACCENT} stroke-width="1.6" stroke-linecap="round" />
          </svg>
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    },
  );
}
