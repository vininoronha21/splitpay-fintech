import { useEffect, useRef, useState } from "react";
import { FileText, House, Plus, Settings, Users, type LucideIcon } from "lucide-react";
import { Link, Navigate, NavLink, Outlet, useMatch, useOutletContext } from "react-router";
import { BrandMark } from "./BrandMark.tsx";
import { OfflineBanner } from "./OfflineBanner.tsx";
import { Avatar, buttonClasses, cx, focusRing } from "./ui/index.ts";
import { useOnline } from "../../lib/online.ts";
import { readUserName } from "../../lib/userName.ts";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

/** The four top-level destinations, shared by the tab bar and the top nav. */
const NAV_ITEMS: NavItem[] = [
  { to: "/inicio", label: "Início", icon: House },
  { to: "/extrato", label: "Extrato", icon: FileText },
  { to: "/amigos", label: "Amigos", icon: Users },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

interface ShellContext {
  userName: string;
}

/**
 * Tab that owns the current screen when it is not the tab's own route:
 * Gastos do mês opens from Início, so Início stays highlighted there.
 * Styling only; `aria-current="page"` stays on real route matches.
 */
function useSectionTab(): string | null {
  return useMatch("/gastos-do-mes") !== null ? "/inicio" : null;
}

/** Name saved at /entrar; only valid inside the routes guarded by AppLayout. */
export function useUserName(): string {
  return useOutletContext<ShellContext>().userName;
}

/**
 * Screen key that changes once each time the connection comes back (spec 014).
 * Keying the outlet with it remounts the screen, so every card fetches again
 * through its own useResource, as when the screen opens (spec 009).
 */
function useReconnectKey(online: boolean): number {
  const [reconnects, setReconnects] = useState(0);
  const wasOnline = useRef(online);
  // An effect, not a state update during render: React 18 then skips the
  // useSyncExternalStore snapshot update in useOnline, and "online" is missed.
  useEffect(() => {
    if (online && !wasOnline.current) {
      setReconnects((count) => count + 1);
    }
    wasOnline.current = online;
  }, [online]);
  return reconnects;
}

/**
 * Guarded layout for every app screen: without a saved name it redirects to
 * /entrar. Top nav from `md`, bottom tab bar below it (CSS only).
 */
export function AppLayout() {
  const userName = readUserName();
  // Início's amber header runs to the screen edges below md, so that screen sets its own gutter there.
  const fullBleed = useMatch("/inicio") !== null;
  const online = useOnline();
  const reconnectKey = useReconnectKey(online);
  const mainRef = useRef<HTMLElement>(null);

  // The remount removes the focused element; keep keyboard users in the screen, not back at the page top.
  useEffect(() => {
    if (reconnectKey > 0 && document.activeElement === document.body) {
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [reconnectKey]);

  if (!userName) {
    return <Navigate to="/entrar" replace />;
  }

  const context: ShellContext = { userName };
  return (
    <div className="min-h-dvh">
      <a
        href="#conteudo"
        className={cx(
          "sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl",
          "focus:bg-surface focus:px-4 focus:py-3 focus:font-semibold focus:text-text focus:shadow-lg",
          focusRing,
        )}
      >
        Pular para o conteúdo
      </a>
      <TopNav userName={userName} />
      {/* Bottom padding keeps the last content above the fixed tab bar (60 px plus safe area). */}
      <main
        ref={mainRef}
        id="conteudo"
        tabIndex={-1}
        className={cx(
          "mx-auto w-full max-w-[1140px] pb-[calc(88px+env(safe-area-inset-bottom))] outline-none md:px-8 md:pt-8 md:pb-12",
          !fullBleed && "px-4 pt-4",
        )}
      >
        {/* In the flow above the screen: it pushes content down instead of covering it. */}
        <OfflineBanner online={online} className={cx("mb-3 md:mb-4", fullBleed && "mx-4 mt-4 md:mx-0 md:mt-0")} />
        <Outlet key={reconnectKey} context={context} />
      </main>
      <TabBar />
    </div>
  );
}

function TabBar() {
  const sectionTab = useSectionTab();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-nav pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              className={({ isActive }) =>
                cx(
                  // No side padding: "Configurações" needs 86 of the 90 px a tab gets at 360 px.
                  "flex min-h-15 flex-col items-center justify-center gap-1 text-xs",
                  isActive || to === sectionTab ? "font-semibold text-accent-text" : "font-medium text-muted hover:text-text",
                  focusRing,
                  "focus-visible:-outline-offset-2",
                )
              }
            >
              <Icon size={22} aria-hidden="true" />
              <span className="max-w-full truncate">{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function TopNav({ userName }: { userName: string }) {
  const sectionTab = useSectionTab();
  return (
    <header className="hidden border-b border-border bg-nav md:block">
      <div className="mx-auto flex h-18 max-w-[1140px] items-center gap-4 px-8 lg:gap-6">
        <Link to="/inicio" className={cx("flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl", focusRing)}>
          {/* Faint light ring: keeps the black roundel visible on the dark nav, invisible on white. */}
          <BrandMark size={36} className="rounded-full ring-1 ring-hero-text/12" />
          <span className="text-lg font-extrabold tracking-[-0.02em]">
            Split<span className="text-accent-text">Pay</span>
          </span>
        </Link>
        <nav aria-label="Principal" className="min-w-0 flex-1">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cx(
                      "flex h-11 items-center rounded-full px-3 text-[15px] whitespace-nowrap transition-colors motion-reduce:transition-none lg:px-3.5",
                      isActive || to === sectionTab
                        ? "bg-accent-soft font-semibold text-accent-soft-text"
                        : "font-medium text-muted hover:text-text",
                      focusRing,
                    )
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {/* A link styled like Button primary: it navigates, it does not submit. */}
        <Link to="/novo-gasto" className={cx(buttonClasses({ size: "sm" }), "shrink-0")}>
          <Plus size={18} aria-hidden="true" />
          Novo gasto
        </Link>
        <Avatar name={userName} tone="accent" label={userName} />
      </div>
    </header>
  );
}
