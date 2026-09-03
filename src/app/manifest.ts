import type { MetadataRoute } from "next";

const ACCENT = "#15803d";
const BACKGROUND = "#020817";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نباتاتي - رفيق صحة نباتاتك",
    short_name: "نباتاتي",
    description:
      "صوّر نبتة لتحديد نوعها وتقييم صحّتها والحصول على إرشادات العناية المناسبة. رفيق صحة نباتاتك على هاتفك.",
    lang: "ar",
    dir: "rtl",
    id: "/",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BACKGROUND,
    theme_color: ACCENT,
    categories: ["health", "lifestyle", "utilities"],
    icons: [
      {
        src: "/icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon/maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "استئناف الفحص",
        short_name: "فحص",
        description: "افتح الكاميرا لفحص نبتة جديدة.",
        url: "/",
        icons: [{ src: "/icon/192", sizes: "192x192" }],
      },
    ],
  };
}
