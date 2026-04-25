import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "default" | "wide" | "narrow";
}

export function Container({
  className,
  size = "default",
  ...props
}: ContainerProps) {
  const max = {
    narrow: "max-w-3xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
  }[size];
  return (
    <div className={cn("mx-auto w-full px-6 md:px-8", max, className)} {...props} />
  );
}
