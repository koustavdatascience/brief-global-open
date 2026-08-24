import type {
  ComponentPropsWithoutRef,
  CSSProperties,
  ElementType,
} from "react";

type BlurredStaggerProps<T extends ElementType> = {
  as?: T;
  children: string;
  className?: string;
  delay?: number;
  stagger?: number;
} & Omit<ComponentPropsWithoutRef<T>, "children" | "className">;

export default function BlurredStagger<T extends ElementType = "span">({
  as,
  children,
  className,
  delay = 0,
  stagger = 22,
  ...props
}: BlurredStaggerProps<T>) {
  const Tag = (as ?? "span") as ElementType;

  return (
    <Tag
      {...props}
      aria-label={children}
      className={className ? `blurred-stagger ${className}` : "blurred-stagger"}
    >
      <span aria-hidden="true" className="blurred-stagger__visual">
        {[...children].map((character, index) => (
          <span
            className="blurred-stagger__char"
            key={`${character}-${index}`}
            style={
              {
                "--blurred-stagger-delay": `${delay + index * stagger}ms`,
              } as CSSProperties
            }
          >
            {character === "\n" ? (
              <br />
            ) : character === " " ? (
              "\u00a0"
            ) : (
              character
            )}
          </span>
        ))}
      </span>
    </Tag>
  );
}
