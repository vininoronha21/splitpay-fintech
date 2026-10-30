import { WifiOff } from "lucide-react";
import { cx } from "./ui/index.ts";

interface OfflineBannerProps {
  online: boolean;
  className?: string;
}

/**
 * Offline notice at the top of the app screens (spec 014). The live region is
 * always mounted and only its content changes, so screen readers announce it.
 * In the page flow, not fixed: it pushes the screen down and never covers content or focus.
 */
export function OfflineBanner({ online, className }: OfflineBannerProps) {
  return (
    <div role="status" className={online ? undefined : className}>
      {online ? null : (
        <p
          className={cx(
            "flex items-start gap-3 rounded-2xl border border-accent-edge/40 bg-accent-soft px-4 py-3",
            "text-sm font-medium text-accent-soft-text",
          )}
        >
          <WifiOff size={18} aria-hidden="true" className="mt-px shrink-0" />
          <span className="min-w-0">Você está sem internet. Os dados voltam a carregar quando a conexão voltar.</span>
        </p>
      )}
    </div>
  );
}
