import Image from "next/image";
import { cn } from "@/lib/utils";

/** نشان رسمی دانشگاه جامع علمی–کاربردی (از تنظیمات پنل قابل تغییر است) */
export function Logo({
  className,
  src = "/images/emblem.png",
}: {
  className?: string;
  src?: string;
}) {
  return (
    <Image
      src={src}
      alt="نشان دانشگاه جامع علمی–کاربردی"
      width={512}
      height={512}
      priority
      className={cn("h-11 w-11 object-contain", className)}
      aria-hidden="true"
    />
  );
}
