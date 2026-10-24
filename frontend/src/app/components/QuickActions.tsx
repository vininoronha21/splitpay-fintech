import { ArrowDownToLine, ArrowRightLeft, Plus, Users, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { cx, focusRing } from "./ui/index.ts";

interface QuickAction {
  to: string;
  label: string;
  icon: LucideIcon;
  primary?: boolean;
}

// Novo gasto reads `tipo` (010) and Extrato reads `status` (011); Amigos opens a placeholder until 012.
const ACTIONS: QuickAction[] = [
  { to: "/novo-gasto", label: "Novo gasto", icon: Plus, primary: true },
  { to: "/novo-gasto?tipo=receita", label: "Receita", icon: ArrowDownToLine },
  { to: "/extrato?status=em_aberto", label: "Reembolsos", icon: ArrowRightLeft },
  { to: "/amigos", label: "Amigos", icon: Users },
];

/** Four shortcuts under the balance, below `md` only (the top nav has "Novo gasto" from there). */
export function QuickActions() {
  return (
    <nav aria-label="Atalhos" className="md:hidden">
      <ul className="grid grid-cols-4 gap-2 pt-2 pb-1">
        {ACTIONS.map(({ to, label, icon: Icon, primary }) => (
          <li key={to} className="min-w-0">
            <Link
              to={to}
              className={cx("group flex flex-col items-center gap-2 rounded-2xl text-center text-xs font-medium", focusRing)}
            >
              <span
                className={cx(
                  "grid size-14 place-items-center rounded-[18px] border transition-colors motion-reduce:transition-none",
                  primary
                    ? "border-accent bg-accent text-on-accent group-hover:bg-accent-strong"
                    : "border-border bg-surface text-text group-hover:bg-neutral-soft",
                )}
              >
                <Icon size={22} aria-hidden="true" />
              </span>
              <span className="max-w-full truncate">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
