import logo from "@/assets/svv-logo.png.asset.json";

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
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={logo.url}
        alt="Somaiya Vidyavihar University"
        style={{ height: size }}
        className="object-contain w-auto max-h-full"
      />
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
