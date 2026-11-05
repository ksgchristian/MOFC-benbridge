import Link from "next/link";

const steps = [
  { n: "1", title: "Talk", body: "Type or speak in your own language. The other side sees it in theirs, instantly." },
  { n: "2", title: "Fill it in together", body: "Answers are drafted into the application as they're said. Nothing is guessed." },
  { n: "3", title: "Confirm", body: "The neighbor checks every field in their own language before anything is submitted." },
];

const features = [
  { title: "One screen, two languages", body: "Spanish on the left, English on the right. Everyone sees what’s said and what’s entered." },
  { title: "Nothing slips through", body: "Numbers, how often, and gross or net are highlighted so they’re never mistaken." },
  { title: "Flag anything", body: "If a translation looks off, either person can flag it on the spot." },
  { title: "You stay in control", body: "Nothing is ever auto-submitted. The navigator confirms each field, and only after a Sí." },
];

export default function Landing() {
  return (
    <div className="flex-1">
      <header className="glass sticky top-0 z-10 border-b border-[var(--separator)]">
        <div className="mx-auto flex h-12 max-w-[980px] items-center justify-between px-5">
          <span className="text-[17px] font-semibold tracking-tight">
            Benefit<span className="text-[var(--accent)]">Bridge</span>
          </span>
          <Link href="/app" className="btn btn-sm btn-primary">Open demo</Link>
        </div>
      </header>

      <section className="mx-auto max-w-[980px] px-5 pb-24 pt-24 text-center sm:pt-32">
        <p className="text-[19px] font-semibold text-[var(--accent)]">BenefitBridge</p>
        <h1 className="mx-auto mt-3 max-w-[780px] text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[72px]">
          Applying for benefits, in every language.
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] text-[19px] leading-snug text-[var(--fg-muted)] sm:text-[24px]">
          A shared screen that translates between a neighbor and a navigator, as they fill in the application together.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/app" className="btn btn-lg btn-primary px-7">Try the demo</Link>
          <a href="#how" className="btn btn-lg btn-plain px-5">How it works ›</a>
        </div>
      </section>

      <section id="how" className="bg-[var(--surface)] py-24">
        <div className="mx-auto max-w-[980px] px-5">
          <h2 className="text-center text-[32px] font-semibold tracking-[-0.025em] sm:text-[48px]">Simple, from first word to last.</h2>
          <ol className="mt-14 grid gap-10 sm:grid-cols-3">
            {steps.map((s) => (
              <li key={s.n} className="text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[19px] font-semibold text-[var(--accent)]">{s.n}</span>
                <h3 className="mt-4 text-[21px] font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[17px] leading-snug text-[var(--fg-muted)]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[980px] px-5 py-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.title} className="card p-8">
              <h3 className="text-[21px] font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-2 text-[17px] leading-snug text-[var(--fg-muted)]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 pb-28 text-center">
        <h2 className="text-[32px] font-semibold tracking-[-0.025em] sm:text-[48px]">See it in action.</h2>
        <div className="mt-8">
          <Link href="/app" className="btn btn-lg btn-primary px-7">Try the demo</Link>
        </div>
      </section>

      <footer className="border-t border-[var(--separator)] px-5 py-8 text-center text-[13px] text-[var(--fg-muted)]">
        Prototype with Mid-Ohio Food Collective. Sample data only.
      </footer>
    </div>
  );
}
