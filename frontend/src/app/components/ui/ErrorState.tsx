import { CircleAlert, RotateCw } from "lucide-react";
import { Button } from "./Button.tsx";
import { Card } from "./Card.tsx";
import { cx } from "./focus.ts";

export interface ErrorStateProps {
  /** What went wrong, in pt-BR (e.g. the API error message). */
  message: string;
  onRetry: () => void;
  title?: string;
  /** Disables the button while the retry is in flight. */
  retrying?: boolean;
  className?: string;
}

/** Error card with a retry action; announced as soon as it appears. */
export function ErrorState({
  message,
  onRetry,
  title = "Não foi possível carregar",
  retrying = false,
  className,
}: ErrorStateProps) {
  return (
    <Card role="alert" className={cx("flex flex-col items-start gap-4", className)}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
          <CircleAlert size={20} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="font-semibold">{title}</p>
          <p className="mt-0.5 text-sm text-muted">{message}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" icon={RotateCw} onClick={onRetry} disabled={retrying}>
        Tentar novamente
      </Button>
    </Card>
  );
}
