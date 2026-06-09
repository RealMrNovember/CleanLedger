import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { openWhatsApp } from "@/lib/whatsapp";

interface WhatsAppButtonProps {
  href: string;
  title?: string;
  className?: string;
  size?: "sm" | "md";
}

export function WhatsAppButton({
  href,
  title = "WhatsApp ile mesaj gönder",
  className,
  size = "sm",
}: WhatsAppButtonProps) {
  const iconSize = size === "sm" ? "size-4" : "size-5";
  const boxSize = size === "sm" ? "size-8" : "size-9";

  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openWhatsApp(href);
      }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:bg-[#1ebe57] hover:shadow-md",
        boxSize,
        className
      )}
    >
      <MessageCircle className={iconSize} fill="currentColor" />
    </button>
  );
}
