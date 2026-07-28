import logo from "@/assets/svv-logo.png.asset.json";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <img src={logo.url} alt="Somaiya Vidyavihar University" style={{ height: size, width: size }} className="object-contain" />
      <div className="leading-tight">
        <div className="text-brand font-semibold tracking-wide text-sm">SOMAIYA</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Vidyavihar University</div>
      </div>
    </div>
  );
}
