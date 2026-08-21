import React from "react";

export const SVV_LOGO_SVG_CONTENT = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 140" width="100%" height="100%">
  <defs>
    <path id="svvTopArc1" d="M 28,76 A 48,48 0 0,1 112,76" fill="none"/>
    <path id="svvTopArc2" d="M 37,76 A 39,39 0 0,1 103,76" fill="none"/>
    <path id="svvBottomArc" d="M 26,68 A 50,50 0 0,0 114,68" fill="none"/>
  </defs>

  <!-- Left: Circular Somaiya Emblem -->
  <g transform="translate(0, 0)">
    <!-- Arc Text: Knowledge Alone Liberates -->
    <text font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="7.5" font-weight="600" fill="#991B1B" letter-spacing="0.8">
      <textPath href="#svvTopArc1" startOffset="50%" text-anchor="middle">Knowledge Alone Liberates</textPath>
    </text>

    <!-- Arc Text: Devanagari Motto -->
    <text font-family="'Noto Sans Devanagari', 'Mangal', 'Yantramanav', sans-serif" font-size="8.5" font-weight="700" fill="#991B1B" letter-spacing="0.5">
      <textPath href="#svvTopArc2" startOffset="50%" text-anchor="middle">ज्ञानादेव तु कैवल्यम्</textPath>
    </text>

    <!-- Arc Text: Somaiya Vidyavihar (Bottom) -->
    <text font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="8.5" font-weight="700" fill="#991B1B" letter-spacing="0.8">
      <textPath href="#svvBottomArc" startOffset="50%" text-anchor="middle">Somaiya Vidyavihar</textPath>
    </text>

    <!-- Center Flame / Jyoti -->
    <path d="M 70,34 C 70,34 79,47 79,57 C 79,63.5 75,67.5 70,67.5 C 65,67.5 61,63.5 61,57 C 61,49.5 66.5,42 66.5,42 C 66.5,42 62.5,47.5 63.5,54.5 C 64.5,59.5 67,62.5 70,62.5 C 73,62.5 75,59.5 74.5,54 C 74,47.5 70,34 70,34 Z" fill="#991B1B"/>

    <!-- Center Diya (Bowl / Base) -->
    <path d="M 26,67 C 34,89 51,99 70,99 C 89,99 106,89 114,67 C 99,83 83,86 70,86 C 57,86 41,83 26,67 Z" fill="#991B1B"/>
  </g>

  <!-- Right: SOMAIYA VIDYAVIHAR UNIVERSITY Typography -->
  <g transform="translate(138, 0)">
    <!-- Main Somaiya Heading -->
    <text x="0" y="70" font-family="'Times New Roman', 'Cinzel', 'Playfair Display', Georgia, serif" font-size="54" font-weight="800" fill="#991B1B" letter-spacing="2.5">SOMAIYA</text>

    <!-- Subtitle: Vidyavihar University -->
    <text x="2" y="98" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" font-size="20" font-weight="800" fill="#991B1B" letter-spacing="3.2">VIDYAVIHAR UNIVERSITY</text>
  </g>
</svg>`;

export const SVV_LOGO_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(SVV_LOGO_SVG_CONTENT)}`;

export function SvvLogoSvg({
  height = 42,
  className = "",
}: {
  height?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 540 140"
      height={height}
      style={{ height: `${height}px`, width: "auto" }}
      className={`shrink-0 select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Somaiya Vidyavihar University"
    >
      <defs>
        <path id="inlineSvvTopArc1" d="M 28,76 A 48,48 0 0,1 112,76" fill="none" />
        <path id="inlineSvvTopArc2" d="M 37,76 A 39,39 0 0,1 103,76" fill="none" />
        <path id="inlineSvvBottomArc" d="M 26,68 A 50,50 0 0,0 114,68" fill="none" />
      </defs>

      {/* Left: Circular Somaiya Emblem */}
      <g>
        {/* Arc Text: Knowledge Alone Liberates */}
        <text
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontSize="7.5"
          fontWeight="600"
          fill="#991B1B"
          letterSpacing="0.8"
        >
          <textPath href="#inlineSvvTopArc1" startOffset="50%" textAnchor="middle">
            Knowledge Alone Liberates
          </textPath>
        </text>

        {/* Arc Text: Devanagari Motto */}
        <text
          fontFamily="'Noto Sans Devanagari', 'Mangal', 'Yantramanav', sans-serif"
          fontSize="8.5"
          fontWeight="700"
          fill="#991B1B"
          letterSpacing="0.5"
        >
          <textPath href="#inlineSvvTopArc2" startOffset="50%" textAnchor="middle">
            ज्ञानादेव तु कैवल्यम्
          </textPath>
        </text>

        {/* Arc Text: Somaiya Vidyavihar (Bottom) */}
        <text
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontSize="8.5"
          fontWeight="700"
          fill="#991B1B"
          letterSpacing="0.8"
        >
          <textPath href="#inlineSvvBottomArc" startOffset="50%" textAnchor="middle">
            Somaiya Vidyavihar
          </textPath>
        </text>

        {/* Center Flame / Jyoti */}
        <path
          d="M 70,34 C 70,34 79,47 79,57 C 79,63.5 75,67.5 70,67.5 C 65,67.5 61,63.5 61,57 C 61,49.5 66.5,42 66.5,42 C 66.5,42 62.5,47.5 63.5,54.5 C 64.5,59.5 67,62.5 70,62.5 C 73,62.5 75,59.5 74.5,54 C 74,47.5 70,34 70,34 Z"
          fill="#991B1B"
        />

        {/* Center Diya (Bowl / Base) */}
        <path
          d="M 26,67 C 34,89 51,99 70,99 C 89,99 106,89 114,67 C 99,83 83,86 70,86 C 57,86 41,83 26,67 Z"
          fill="#991B1B"
        />
      </g>

      {/* Right: SOMAIYA VIDYAVIHAR UNIVERSITY Typography */}
      <g transform="translate(138, 0)">
        <text
          x="0"
          y="70"
          fontFamily="'Times New Roman', 'Cinzel', 'Playfair Display', Georgia, serif"
          fontSize="54"
          fontWeight="800"
          fill="#991B1B"
          letterSpacing="2.5"
        >
          SOMAIYA
        </text>
        <text
          x="2"
          y="98"
          fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          fontSize="20"
          fontWeight="800"
          fill="#991B1B"
          letterSpacing="3.2"
        >
          VIDYAVIHAR UNIVERSITY
        </text>
      </g>
    </svg>
  );
}

export function Logo({
  size = 48,
  className = "",
  showText = false,
}: {
  size?: number;
  className?: string;
  showText?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SvvLogoSvg height={size} />
      {showText && (
        <div className="leading-tight">
          <div className="text-brand font-semibold tracking-wide text-sm">SOMAIYA</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Vidyavihar University
          </div>
        </div>
      )}
    </div>
  );
}
