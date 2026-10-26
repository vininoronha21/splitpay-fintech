import { useState } from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router";
import { AdjustBalanceCard } from "./AdjustBalanceCard.tsx";
import { AdjustmentHistory } from "./AdjustmentHistory.tsx";
import { BudgetInfoCard } from "./BudgetInfoCard.tsx";
import { CategoryRulesCard } from "./CategoryRulesCard.tsx";
import { ProfileCard } from "./ProfileCard.tsx";
import { ScreenTitle } from "./ScreenPlaceholder.tsx";
import { ThemeControl } from "./ThemeControl.tsx";
import { Button, Card } from "./ui/index.ts";
import { clearUserName } from "../../lib/userName.ts";

/**
 * Configurações (spec 012), in the prototype order. Each card loads its own
 * data; `balanceVersion` is the one shared reload: an adjustment bumps it, and
 * "Saldo atual" and the history fetch again.
 */
export function SettingsScreen() {
  const navigate = useNavigate();
  const [balanceVersion, setBalanceVersion] = useState(0);

  function signOut() {
    clearUserName();
    navigate("/entrar", { replace: true });
  }

  return (
    <div className="mx-auto flex w-full max-w-[640px] flex-col gap-3 md:gap-4">
      <ScreenTitle>Configurações</ScreenTitle>
      <ProfileCard />
      <Card>
        <ThemeControl />
      </Card>
      <AdjustBalanceCard version={balanceVersion} onAdjusted={() => setBalanceVersion((version) => version + 1)} />
      <AdjustmentHistory version={balanceVersion} />
      <BudgetInfoCard />
      <CategoryRulesCard />
      <Button variant="danger" icon={LogOut} fullWidth onClick={signOut}>
        Sair
      </Button>
    </div>
  );
}
