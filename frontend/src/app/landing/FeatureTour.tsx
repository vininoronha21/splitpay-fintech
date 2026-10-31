import { Check } from "lucide-react";
import type { ComponentType } from "react";
import { BalanceScreen, ChartsScreen, ReceivablesScreen, RulesScreen, SplitScreen } from "./FeatureScreens.tsx";
import { CONTAINER, Eyebrow, SECTION, SECTION_LEAD, SECTION_TITLE } from "./LandingParts.tsx";
import { cx } from "../components/ui/index.ts";

interface Feature {
  /** Short name, used in the tour's progress bar. */
  name: string;
  title: string;
  text: string;
  points: readonly string[];
  Screen: ComponentType;
}

const FEATURES: readonly Feature[] = [
  {
    name: "Divisão 1 para 1",
    title: "Divida com um amigo do jeito que vocês combinaram",
    text: "Meio a meio, por porcentagem ou por um valor fixo. Você informa só a parte do amigo e o SplitPay calcula a sua na hora, com a soma sempre igual ao total.",
    points: [
      "Três modos: igual, porcentagem ou valor fixo",
      "O centavo que sobra fica com quem pagou",
      "No orçamento do mês entra só a sua parte",
    ],
    Screen: SplitScreen,
  },
  {
    name: "Categorias",
    title: "A categoria aparece enquanto você digita",
    text: "Escreva Janta e o gasto vai para Alimentação. Combustível vai para Transporte. Quando uma palavra é só sua, crie uma regra e ela passa a valer antes das regras padrão.",
    points: [
      "Regras padrão prontas desde o primeiro gasto",
      "As regras que você cria têm prioridade",
      "Compara palavras inteiras: bar não vira Barbearia",
    ],
    Screen: RulesScreen,
  },
  {
    name: "A receber",
    title: "Cada reembolso com um status claro",
    text: "A parte do amigo vira um valor a receber. Quando ele devolver, marque Recebi e o dinheiro volta para o saldo. Se vocês acertaram de outro jeito, Já acertamos encerra a conta sem mexer no saldo.",
    points: [
      "Aguardando reembolso, Pago ou Acertado",
      "Filtro por status no extrato",
      "Local, parcela, forma de pagamento e observações em cada lançamento",
    ],
    Screen: ReceivablesScreen,
  },
  {
    name: "Saldo",
    title: "Um saldo que você consegue explicar",
    text: "Saldo inicial, mais entradas, menos saídas, mais ajustes. Todo ajuste manual pede um motivo e fica no histórico com o valor de antes e o de depois.",
    points: [
      "Ajuste só com justificativa",
      "Histórico com o saldo anterior e o novo",
      "Nenhum valor muda sem deixar rastro",
    ],
    Screen: BalanceScreen,
  },
  {
    name: "Gráficos",
    title: "Para onde foi o seu dinheiro, na semana, no mês ou no ano",
    text: "Gastos por categoria e por amigo, com navegação entre períodos. Toque em uma categoria para ver os lançamentos que formam o valor.",
    points: [
      "Visão semanal, mensal e anual",
      "Conta só a sua parte de cada despesa",
      "Quanto cada amigo assumiu nas despesas divididas",
    ],
    Screen: ChartsScreen,
  },
];

/**
 * "Funcionalidades": one block per feature, copy beside an app screen drawn in
 * markup. Static, it is a list of five blocks (phones, reduced motion, no JS).
 * From md with room to pin, useLandingMotion turns it into a stepped tour: the
 * blocks stack in one stage and the device keeps its place while the screen
 * inside changes. The progress bar only exists for that tour.
 */
export function FeatureTour() {
  return (
    <section id="funcionalidades" aria-labelledby="funcionalidades-titulo" className={cx(SECTION, "bg-surface")}>
      <div className={CONTAINER}>
        <div data-motion="reveal">
          <Eyebrow>Funcionalidades</Eyebrow>
          <h2 id="funcionalidades-titulo" className={cx(SECTION_TITLE, "mt-5")}>
            Do pagamento da conta ao dinheiro de volta
          </h2>
          <p className={SECTION_LEAD}>
            Cinco recursos que cobrem o caminho inteiro de um gasto dividido, mostrados aqui do jeito que aparecem no app.
          </p>
        </div>

        <div data-motion="tour" className="mt-12 lg:mt-16">
          <div data-motion="tour-progress" aria-hidden="true" className="hidden grid-cols-5 gap-3 pb-8">
            {FEATURES.map((feature) => (
              <div key={feature.name} className="min-w-0">
                <span data-motion="tour-label" className="block truncate text-sm font-semibold text-muted">
                  {feature.name}
                </span>
                <span className="mt-2 block h-1 overflow-hidden rounded-full bg-track">
                  <span data-motion="tour-bar" className="block size-full origin-left rounded-full bg-accent" />
                </span>
              </div>
            ))}
          </div>

          <ol data-motion="tour-list" className="flex flex-col gap-20 md:gap-28">
            {FEATURES.map(({ name, title, text, points, Screen }, index) => (
              <li
                key={name}
                data-motion="tour-step"
                className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,400px)] md:gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-20"
              >
                <div data-motion="tour-copy" className="max-w-[480px]">
                  <p className="flex items-center gap-3 text-sm font-semibold">
                    <span className="num text-accent-text">{String(index + 1).padStart(2, "0")}</span>
                    <span aria-hidden="true" className="h-px w-8 bg-border" />
                    <span className="text-muted">{name}</span>
                  </p>
                  <h3 className="mt-4 text-2xl leading-tight font-bold tracking-[-0.01em] text-balance md:text-[28px]">
                    {title}
                  </h3>
                  <p className="mt-3 text-base text-pretty text-muted">{text}</p>
                  <ul className="mt-6 space-y-3">
                    {points.map((point) => (
                      <li key={point} className="flex items-start gap-3 text-[15px]">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-accent text-on-accent"
                        >
                          <Check size={12} strokeWidth={3} />
                        </span>
                        <span className="min-w-0">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Screen />
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
