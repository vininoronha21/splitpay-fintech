import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight, House } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { cx, focusRing, focusRingOnAccent } from "./ui/index.ts";
import { clearUserName } from "../../lib/userName.ts";

interface UserMenuProps {
  /** Accessible name of the trigger; it starts with the trigger's visible text. */
  label: string;
  /** Trigger content: the avatar on the top nav, initials and greeting on the amber header. */
  children: ReactNode;
  /** `accent` for the amber balance header, `surface` for the top nav. */
  tone: "surface" | "accent";
  /** Popover edge aligned with the trigger: `end` for the top nav corner, `start` for the header row. */
  align: "start" | "end";
  className?: string;
}

const TRIGGER_TONE = {
  surface: cx("rounded-full hover:bg-neutral-soft", focusRing),
  // on-accent is the same near-black in both themes, so a tint of it is theme-safe.
  accent: cx("rounded-xl text-on-accent hover:bg-on-accent/10", focusRingOnAccent),
} as const;

// Inset ring: the popover is tight around its items, so an outer ring would touch the edge.
const ITEM_CLASS = cx(
  "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium text-text",
  "transition-colors hover:bg-neutral-soft motion-reduce:transition-none",
  focusRing,
  "focus-visible:-outline-offset-2",
);

/**
 * User menu (spec 016): a disclosure button with two actions, "Trocar usuário"
 * (same path as "Sair" in Configurações) and back to the landing page.
 * Closes on Escape (focus returns to the trigger), outside click, focus
 * leaving the menu, and after choosing an item.
 */
export function UserMenu({ label, children, tone, align, className }: UserMenuProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  function switchUser() {
    setOpen(false);
    clearUserName();
    navigate("/entrar", { replace: true });
  }

  return (
    <div
      ref={rootRef}
      className={cx("relative min-w-0", className)}
      onBlur={(event) => {
        // Null relatedTarget (a click on a non-focusable spot) is left to the pointerdown handler.
        const next = event.relatedTarget;
        if (next instanceof Node && !event.currentTarget.contains(next)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-controls={popoverId}
        onClick={() => setOpen((value) => !value)}
        className={cx(
          "flex min-h-11 max-w-full min-w-11 items-center transition-colors motion-reduce:transition-none",
          TRIGGER_TONE[tone],
        )}
      >
        {children}
      </button>
      <div
        id={popoverId}
        hidden={!open}
        className={cx(
          // Never wider than the screen minus both 16 px gutters, so it fits at 360 px.
          "absolute top-full z-30 mt-2 w-72 max-w-[calc(100vw-32px)] rounded-2xl border border-border bg-surface p-1.5",
          "shadow-[0_8px_24px_rgba(0,0,0,.12)]",
          align === "end" ? "right-0" : "left-0",
        )}
      >
        <ul className="flex flex-col gap-0.5">
          <li>
            <button type="button" onClick={switchUser} className={ITEM_CLASS}>
              <ArrowLeftRight size={20} aria-hidden="true" className="shrink-0 text-muted" />
              Trocar usuário
            </button>
          </li>
          <li>
            <Link to="/" onClick={() => setOpen(false)} className={ITEM_CLASS}>
              <House size={20} aria-hidden="true" className="shrink-0 text-muted" />
              Voltar para a página inicial
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
