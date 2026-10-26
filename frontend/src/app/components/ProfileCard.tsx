import { useUserName } from "./AppLayout.tsx";
import { Avatar, Card } from "./ui/index.ts";

/** Top of Configurações: the name saved at /entrar (Business Rule 4); there is no real account. */
export function ProfileCard() {
  const name = useUserName();
  return (
    <Card className="flex items-center gap-3">
      <Avatar name={name} tone="accent" className="size-12! text-sm!" />
      <div className="min-w-0">
        <p className="truncate text-base leading-snug font-semibold" title={name}>
          {name}
        </p>
        <p className="text-[13px] text-muted">Conta de demonstração</p>
      </div>
    </Card>
  );
}
