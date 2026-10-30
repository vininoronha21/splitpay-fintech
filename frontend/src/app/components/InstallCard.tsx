import { useId } from "react";
import { Download } from "lucide-react";
import { CardHeader } from "./CardHeader.tsx";
import { Button, Card } from "./ui/index.ts";

/**
 * "Instalar o app" in Configurações (spec 014), visual only while SplitPay is an
 * unpublished prototype (Business Rule 21). The button stays focusable with
 * `aria-disabled` and has no handler, so pressing it does nothing; the note
 * explains why. Shown on every device, with no browser detection.
 */
export function InstallCard() {
  const titleId = useId();
  const noteId = useId();
  return (
    <Card aria-labelledby={titleId} className="md:p-6">
      <CardHeader title="Instalar o app" titleId={titleId} note="Use o SplitPay como um app, direto da tela inicial." />
      <Button icon={Download} fullWidth aria-disabled="true" aria-describedby={noteId} className="mt-4">
        Instalar
      </Button>
      <p id={noteId} className="mt-2 text-xs text-muted">
        Disponível quando o app for publicado.
      </p>
    </Card>
  );
}
