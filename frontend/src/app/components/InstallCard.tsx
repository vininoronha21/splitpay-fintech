import { useId } from "react";
import { Download } from "lucide-react";
import { CardHeader } from "./CardHeader.tsx";
import { Button, Card, cx } from "./ui/index.ts";

/**
 * "Instalar o app" in Configurações (spec 014), visual only while SplitPay is an
 * unpublished prototype (Business Rule 21). The button stays focusable with
 * `aria-disabled` and has no handler, so pressing it does nothing; the note
 * explains why. Shown on every device, with no browser detection.
 *
 * Unavailable look: a neutral fill with a dashed `field-border` edge and `muted`
 * text at full opacity, instead of the 50 % faded amber used while a form saves.
 * The faded amber read as a broken primary button in dark mode and also faded
 * the focus ring below 3:1; this one reads as "not yet" and keeps the ring solid.
 */
const UNAVAILABLE =
  "border-dashed border-field-border! bg-neutral-soft! text-muted! aria-disabled:opacity-100!";

export function InstallCard() {
  const titleId = useId();
  const noteId = useId();
  return (
    <Card aria-labelledby={titleId} className="md:p-6">
      <CardHeader title="Instalar o app" titleId={titleId} note="Use o SplitPay como um app, direto da tela inicial." />
      <Button
        variant="ghost"
        icon={Download}
        fullWidth
        aria-disabled="true"
        aria-describedby={noteId}
        className={cx("mt-4", UNAVAILABLE)}
      >
        Instalar
      </Button>
      <p id={noteId} className="mt-2 text-xs text-muted">
        Disponível quando o app for publicado.
      </p>
    </Card>
  );
}
