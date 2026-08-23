import React from "react";

type BrandMarkProps = {
  compact?: boolean;
  subtitle?: string;
  name?: string;
};

export default function BrandMark({
  compact = false,
  subtitle,
  name = "Brief",
}: BrandMarkProps) {
  return (
    <span className="inline-flex items-center gap-3">
      <span
        className={`grid place-items-center rounded-xl bg-[#111827] font-mono text-[0.68rem] font-medium tracking-[-0.08em] text-white ${compact ? "h-8 w-8" : "h-10 w-10"}`}
      >
        B.
      </span>
      <span>
        <span className="block text-[1.04rem] font-semibold tracking-[-0.04em] text-[#111827]">
          {name}
        </span>
        {!compact && subtitle && (
          <span className="mt-0.5 block font-mono text-[0.56rem] font-medium uppercase tracking-[0.1em] text-[#7a8290]">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
}
