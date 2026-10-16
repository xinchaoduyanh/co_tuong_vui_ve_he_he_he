import { PageHeader } from "@/components/brand";
import { CULTURE_FACTS, PIECES, RESULT_PROVERBS } from "@/lib/culture";

export const metadata = { title: "Văn hóa cờ tướng" };

function Disc({ char, tone }: { char: string; tone: "r" | "b" }) {
  return (
    <span
      aria-hidden
      className="font-han flex h-11 w-11 items-center justify-center rounded-full text-xl font-bold shadow-[0_3px_6px_-2px_rgb(0_0_0/0.5)] ring-1 ring-[#8A5E2E]"
      style={{
        background: "radial-gradient(circle at 35% 30%, #F8E9BF, #E5C584 55%, #C99B55)",
        color: tone === "r" ? "#C0281B" : "#1B1B1B",
      }}
    >
      {char}
    </span>
  );
}

export default function CulturePage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-20 pt-6 sm:pt-10">
      <PageHeader title="Văn hóa cờ tướng" />

      <section aria-labelledby="pieces" className="rise">
        <h2 id="pieces" className="font-display text-2xl font-semibold">
          Bảy loại quân
        </h2>
        <ul className="mt-4 flex flex-col gap-1">
          {PIECES.map((p) => (
            <li key={p.name} className="panel-lacquer flex items-center gap-3 rounded-lg px-3 py-3">
              <div className="flex shrink-0 gap-1.5">
                <Disc char={p.red} tone="r" />
                <Disc char={p.black} tone="b" />
              </div>
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold leading-tight">{p.name}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{p.moves}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="stories" className="mt-12">
        <h2 id="stories" className="font-display text-2xl font-semibold">
          Cổ tích bàn cờ
        </h2>
        <ul className="mt-4 flex flex-col gap-3">
          {CULTURE_FACTS.map((fact) => (
            <li key={fact.title} className="panel-lacquer panel-frame meander-top rounded-lg px-4 pb-4 pt-5">
              <div className="flex items-start gap-4">
                {fact.han && (
                  <p
                    className="font-han shrink-0 text-2xl font-bold leading-tight text-primary [writing-mode:vertical-rl]"
                    aria-hidden
                    style={{ maxHeight: "7rem" }}
                  >
                    {fact.han}
                  </p>
                )}
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-semibold leading-snug">{fact.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{fact.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sayings" className="mt-12">
        <h2 id="sayings" className="font-display text-2xl font-semibold">
          Lời răn nhà cờ
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-3">
          {Object.values(RESULT_PROVERBS).map((p) => (
            <li key={p.han} className="panel-lacquer rounded-lg px-4 py-4">
              <p className="font-han text-lg font-bold text-primary">{p.han}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{p.vi}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
