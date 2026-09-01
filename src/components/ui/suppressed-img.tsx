import { cn } from "@/lib/utils";

type SuppressedImgProps = React.ComponentProps<"img">;

export function SuppressedImg({ className, alt = "", ...props }: SuppressedImgProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} className={cn(className)} {...props} />
  );
}
