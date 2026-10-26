import { CircleAlert, CircleCheck } from "lucide-react";

interface FormFeedbackProps {
  /** pt-BR success line, e.g. "Regra criada."; null shows nothing. */
  success: string | null;
  /** pt-BR API error, e.g. the 409 message; null shows nothing. */
  error: string | null;
  /** Id of the error line, so a field the API rejected can point at it with aria-describedby. */
  errorId?: string;
}

/**
 * The result line under a small form (spec 012). The status region stays
 * mounted, so a success line is announced when it appears; clear it before
 * each request so the same text twice is announced twice. Each line carries
 * its own top margin, so nothing adds space while both are empty.
 */
export function FormFeedback({ success, error, errorId }: FormFeedbackProps) {
  return (
    <div>
      {error ? (
        <p id={errorId} role="alert" className="mt-3 flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{error}</span>
        </p>
      ) : null}
      <div role="status">
        {success ? (
          <p className="mt-3 flex items-start gap-1.5 text-sm font-medium text-success-soft-text">
            <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{success}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}
