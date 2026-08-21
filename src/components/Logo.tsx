import React from "react";

export const SVV_MAROON = "#861F1F"; // Official Somaiya Maroon

export function SvvLogoSvg({
  height = 42,
  className = "",
  align = "left",
}: {
  height?: number;
  className?: string;
  align?: "left" | "center";
}) {
  const isCenter = align === "center";
  return (
    <svg
      viewBox={isCenter ? "0 0 380 75" : "0 0 320 75"}
      height={height}
      style={{ height: `${height}px`, width: "auto" }}
      className={`shrink-0 select-none overflow-visible ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Somaiya Vidyavihar University"
    >
      <text
        x={isCenter ? 190 : 0}
        y={isCenter ? 42 : 40}
        textAnchor={isCenter ? "middle" : "start"}
        fontFamily="'Times New Roman', 'Cinzel', 'Playfair Display', Georgia, serif"
        fontSize={isCenter ? 48 : 46}
        fontWeight="800"
        fill={SVV_MAROON}
        letterSpacing="2.2"
      >
        SOMAIYA
      </text>
      <text
        x={isCenter ? 190 : 1}
        y={isCenter ? 68 : 66}
        textAnchor={isCenter ? "middle" : "start"}
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        fontSize={isCenter ? 17.5 : 15}
        fontWeight="800"
        fill={SVV_MAROON}
        letterSpacing="2.4"
      >
        VIDYAVIHAR UNIVERSITY
      </text>
    </svg>
  );
}

export function Logo({
  size = 42,
  className = "",
  showText = false,
}: {
  size?: number;
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={`flex items-center ${className}`}>
      <SvvLogoSvg height={size} align="left" />
      {showText && (
        <div className="leading-tight text-left ml-2">
          <div className="text-brand font-semibold tracking-wide text-sm">SOMAIYA</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Vidyavihar University
          </div>
        </div>
      )}
    </div>
  );
}
