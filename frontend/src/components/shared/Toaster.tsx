"use client";
import * as Toast from "@radix-ui/react-toast";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToastStore, type ToastType } from "@/hooks/useToast";

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />,
  error: <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />,
  info: <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />,
};

const borderMap: Record<ToastType, string> = {
  success: "border-l-green-500",
  error: "border-l-red-500",
  info: "border-l-blue-500",
};

export default function Toaster() {
  const { toasts, dismiss } = useToastStore();

  return (
    <Toast.Provider swipeDirection="right" duration={4000}>
      {toasts.map((t) => (
        <Toast.Root
          key={t.id}
          open
          onOpenChange={(open) => { if (!open) dismiss(t.id); }}
          className={cn(
            "bg-white border border-gray-100 border-l-4 shadow-lg rounded-xl",
            "flex items-start gap-3 px-4 py-3 w-[360px] max-w-[calc(100vw-2rem)]",
            "data-[state=open]:animate-[toast-slide-in_0.2s_ease-out]",
            "data-[state=closed]:animate-[toast-fade-out_0.15s_ease-in]",
            "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] transition-none",
            "data-[swipe=cancel]:translate-x-0 transition-transform",
            "data-[swipe=end]:animate-[toast-swipe-out_0.2s_ease-in]",
            borderMap[t.type]
          )}
        >
          {iconMap[t.type]}
          <div className="flex-1 min-w-0">
            <Toast.Title className="text-sm font-semibold text-gray-900 leading-snug">
              {t.title}
            </Toast.Title>
            {t.description && (
              <Toast.Description className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                {t.description}
              </Toast.Description>
            )}
          </div>
          <Toast.Close
            onClick={() => dismiss(t.id)}
            className="text-gray-300 hover:text-gray-500 transition-colors mt-0.5 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-5 right-5 flex flex-col gap-2 z-[100] outline-none" />
    </Toast.Provider>
  );
}
