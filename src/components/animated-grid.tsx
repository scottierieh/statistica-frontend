'use client';
import { cn } from "@/lib/utils";
import { gridItems, GridItem } from "@/lib/animated-grid";

const Row = ({
  items,
  duration = "120s",
  direction = "normal",
}: {
  items: GridItem[];
  duration?: string;
  direction?: "normal" | "reverse";
}) => {
  return (
    <div className="flex w-max animate-scroll" style={{ "--duration": duration, "--direction": direction } as React.CSSProperties}>
      {[...items, ...items].map((item, index) => (
        <div
          key={index}
          className="w-[300px] shrink-0 p-3"
        >
          <div className="flex h-full flex-col items-center justify-center rounded-2xl border bg-secondary/50 p-6 shadow-md transition-all hover:scale-[1.02] hover:shadow-lg">
            <p className="text-xs font-semibold uppercase text-primary tracking-widest">{item.category}</p>
            <p className="mt-1 text-center font-semibold text-foreground">{item.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export function AnimatedGrid() {
  const row1 = gridItems.slice(0, 6);
  const row2 = gridItems.slice(6, 12);
  const row3 = gridItems.slice(12, 18);

  return (
    <div className="relative -mx-6 flex w-screen max-w-full flex-col gap-4 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      <Row items={row1} duration="60s" />
      <Row items={row2} duration="80s" direction="reverse" />
      <Row items={row3} duration="70s" />
    </div>
  );
}
