import { ChartPie, CircleCheck, Scale, Split, WandSparkles, type LucideIcon } from "lucide-react";
import { cx } from "../components/ui/index.ts";

interface Feature {
  /** User story it presents, from docs/goal.md. */
  story: string;
  icon: LucideIcon;
  title: string;
  text: string;
}

const FEATURES: readonly Feature[] = [
  {
    story: "US01",
    icon: Split,
    title: "Divisão 1 para 1",
    text: "Igual, por porcentagem ou valor fixo. A parte do amigo vira um valor a receber.",
  },
  {
    story: "US02",
    icon: WandSparkles,
    title: "Categoria automática",
    text: "Escreva Janta e a categoria Alimentação aparece sozinha. Crie as suas regras.",
  },
  {
    story: "US03",
    icon: CircleCheck,
    title: "Reembolso com status",
    text: "Aguardando, pago ou acertado. Cada lançamento guarda local, parcela e observações.",
  },
  {
    story: "US04",
    icon: ChartPie,
    title: "Gráficos por período",
    text: "Gastos por categoria e por amigo na semana, no mês ou no ano.",
  },
  {
    story: "US05",
    icon: Scale,
    title: "Saldo sempre explicado",
    text: "Saldo inicial, entradas e saídas, e ajustes com justificativa no histórico.",
  },
];

/** "O que dá para fazer": one card per story; US01 is the amber highlight spanning two columns. */
export function FeatureGrid() {
  return (
    <ul className="grid gap-3 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
      {FEATURES.map(({ story, icon: Icon, title, text }, index) => {
        const highlight = index === 0;
        return (
          <li
            key={story}
            data-motion="feature"
            className={cx(
              "flex flex-col rounded-[20px] p-6 md:p-8",
              highlight
                ? "bg-accent text-on-accent md:col-span-2"
                : "border border-border bg-surface shadow-xs",
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                "grid size-[42px] place-items-center rounded-full",
                highlight ? "bg-on-accent text-accent" : "bg-accent text-on-accent",
              )}
            >
              <Icon size={20} />
            </span>
            <h3 className={cx("mt-5 text-xl leading-tight font-bold", highlight && "md:mt-auto md:pt-10 md:text-2xl")}>
              {title}
            </h3>
            <p className={cx("mt-2 text-base", highlight ? "text-on-accent/80 md:max-w-[460px]" : "text-muted")}>{text}</p>
          </li>
        );
      })}
    </ul>
  );
}
