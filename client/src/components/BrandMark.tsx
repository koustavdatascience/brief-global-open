type BrandMarkProps = {
  compact?: boolean;
  subtitle?: string;
  name?: string;
  tone?: "dark" | "light";
};

export default function BrandMark({
  compact = false,
  subtitle,
  name = "Brief",
  tone = "dark",
}: BrandMarkProps) {
  const isLight = tone === "light";

  return (
    <span className="inline-flex items-center gap-3">
      <span
        className={`grid place-items-center rounded-xl font-mono text-[0.68rem] font-medium tracking-[-0.08em] ${
          compact ? "h-7 w-7" : "h-10 w-10"
        } ${isLight ? "bg-white text-[#07080b]" : "bg-[#111827] text-white"}`}
      >
        B.
      </span>
      <span>
        <span
          className={`block ${compact ? "text-[0.95rem]" : "text-[1.04rem]"} font-semibold tracking-[-0.04em] ${
            isLight ? "text-white" : "text-[#111827]"
          }`}
        >
          {name}
        </span>
        {!compact && subtitle && (
          <span
            className={`mt-0.5 block font-mono text-[0.56rem] font-medium uppercase tracking-[0.1em] ${
              isLight ? "text-white/45" : "text-[#7a8290]"
            }`}
          >
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
