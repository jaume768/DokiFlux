import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DokiFlux — Genera interfaces React con IA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "radial-gradient(circle at 20% 20%, #1a1a2e 0%, #0a0a0f 60%)",
          color: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            D
          </div>
          <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>
            DokiFlux
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              backgroundImage:
                "linear-gradient(90deg, #ffffff 0%, #c4b5fd 60%, #f9a8d4 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            De prompt a prototipo React
            <br />
            en segundos.
          </div>
          <div style={{ fontSize: 32, color: "#a1a1aa", maxWidth: 900 }}>
            Genera interfaces, valida ideas e itera con IA. Sin fricción.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 24,
            color: "#71717a",
          }}
        >
          <div>dokiflux.com</div>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "12px 24px",
              borderRadius: 999,
              border: "2px solid #27272a",
              color: "#e4e4e7",
              fontSize: 22,
            }}
          >
            <span style={{ color: "#a78bfa" }}>▲</span> Generador de UI con IA
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
