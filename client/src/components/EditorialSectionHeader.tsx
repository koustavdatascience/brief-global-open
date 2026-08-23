import React from "react";
import EditorialLabel from "@/components/EditorialLabel";

type EditorialSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  tone?: "paper" | "ink";
  layout?: "stack" | "split";
};

export default function EditorialSectionHeader({
  eyebrow,
  title,
  description,
  aside,
  tone = "paper",
  layout = "stack",
}: EditorialSectionHeaderProps) {
  const isInk = tone === "ink";
  const layoutClass =
    layout === "split"
      ? "grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end"
      : "flex flex-wrap items-end justify-between gap-6";
  const titleClass = isInk ? "text-[#f4f0e8]" : "text-[#17313b]";
  const copyClass = isInk ? "text-[#f4f0e8]/65" : "text-[#63757b]";

  return (
    <div className={layoutClass}>
      <div className={layout === "split" ? "contents" : "max-w-2xl"}>
        <EditorialLabel>{eyebrow}</EditorialLabel>
        <div className={layout === "split" ? "lg:col-start-2" : ""}>
          <h2
            className={`mt-4 font-display text-4xl tracking-[-0.05em] sm:text-5xl ${titleClass}`}
          >
            {title}
          </h2>
          {description && (
            <p className={`mt-3 text-sm leading-6 ${copyClass}`}>
              {description}
            </p>
          )}
        </div>
      </div>
      {aside}
    </div>
  );
}
