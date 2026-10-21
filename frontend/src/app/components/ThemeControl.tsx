import { useId } from "react";
import { useThemePreference, type ThemePreference } from "../../lib/preferences.ts";
import { Segmented, type SegmentedOption } from "./ui/Segmented.tsx";

const THEME_OPTIONS: SegmentedOption<ThemePreference>[] = [
  { value: "claro", label: "Claro" },
  { value: "escuro", label: "Escuro" },
  { value: "automatico", label: "Automático" },
];

interface ThemeControlProps {
  className?: string;
}

/** "Aparência" block for Configurações; wrap it in a Card where it is placed. */
export function ThemeControl({ className }: ThemeControlProps) {
  const [theme, setTheme] = useThemePreference();
  const headingId = useId();
  const hintId = useId();
  return (
    <div className={className}>
      <h2 id={headingId} className="text-base font-semibold">
        Aparência
      </h2>
      <Segmented
        className="mt-3"
        label="Aparência"
        labelledBy={headingId}
        describedBy={hintId}
        options={THEME_OPTIONS}
        value={theme}
        onChange={setTheme}
      />
      <p id={hintId} className="mt-2 text-xs text-muted">
        Automático segue o tema do seu celular ou computador.
      </p>
    </div>
  );
}
