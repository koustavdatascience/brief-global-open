import React from "react";

export default function EditorialLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <p className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-[#b85536]">
      {children}
    </p>
  );
}
