import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  xs: "w-3 h-3 border-[1.5px]",
  sm: "w-4 h-4 border-2",
  md: "w-6 h-6 border-2",
  lg: "w-8 h-8 border-[3px]",
};

export default function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "rounded-full border-gray-200 border-t-blue-600 animate-spin",
        sizeMap[size],
        className
      )}
    />
  );
}

/** Full-area centred loader — drop inside any flex/grid container */
export function PageLoader() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[280px]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-gray-400">Loading…</p>
      </div>
    </div>
  );
}
