import { ImageResponse } from "next/og";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#16a34a",
          color: "white",
          fontSize: 290,
          fontWeight: 700,
        }}
      >
        M
      </div>
    ),
    { width: 512, height: 512 },
  );
}
