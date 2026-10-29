interface Step {
  title: string;
  text: string;
}

const STEPS: readonly Step[] = [
  { title: "Registre o gasto", text: "Valor, descrição e data. O resto é opcional." },
  { title: "Divida com um amigo", text: "Veja na hora quanto é a sua parte e quanto é a dele." },
  { title: "Marque quando receber", text: "Recebi devolve o valor ao saldo. Já acertamos encerra sem mexer no saldo." },
];

/**
 * "Como funciona": numbered steps joined by an 11 px rail. Each step but the last
 * draws the rail down to the next number; the amber fill starts full, so the page
 * reads the same without motion.
 */
export function HowItWorks() {
  return (
    <ol data-motion="steps" className="flex max-w-[720px] flex-col gap-4">
      {STEPS.map(({ title, text }, index) => (
        <li key={title} data-motion="step" className="relative flex items-start gap-4 md:gap-6">
          {index < STEPS.length - 1 ? (
            // From this number's center (24 px) to the next one's: the 16 px gap plus 24 px.
            <span aria-hidden="true" className="absolute top-6 -bottom-10 left-[18.5px] w-[11px] rounded-full bg-track">
              <span data-motion="rail" className="block size-full origin-top rounded-full bg-accent" />
            </span>
          ) : null}
          <span
            aria-hidden="true"
            className="num relative grid size-12 shrink-0 place-items-center rounded-full bg-accent text-lg font-bold text-on-accent"
          >
            {index + 1}
          </span>
          <div className="min-w-0 flex-1 rounded-[20px] border border-border bg-surface p-5 shadow-xs md:p-6">
            <h3 className="text-xl leading-tight font-bold">{title}</h3>
            <p className="mt-2 text-base text-muted">{text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
