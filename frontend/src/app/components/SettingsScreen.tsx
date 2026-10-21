import { LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { ScreenTitle } from "./ScreenPlaceholder.tsx";
import { ThemeControl } from "./ThemeControl.tsx";
import { Button, Card } from "./ui/index.ts";
import { clearUserName } from "../../lib/userName.ts";

/** Configurações: Aparência and Sair for now; the rest of the screen arrives in 012. */
export function SettingsScreen() {
  const navigate = useNavigate();

  function signOut() {
    clearUserName();
    navigate("/entrar", { replace: true });
  }

  return (
    <div className="flex max-w-xl flex-col gap-3">
      <ScreenTitle>Configurações</ScreenTitle>
      <Card className="mt-1">
        <ThemeControl />
      </Card>
      <Button variant="danger" icon={LogOut} fullWidth onClick={signOut}>
        Sair
      </Button>
    </div>
  );
}
