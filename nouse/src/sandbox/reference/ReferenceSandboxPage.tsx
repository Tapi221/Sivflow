type ReferenceLink = {
  title: string;
  description: string;
  href: string;
};
type ReferenceSandboxPageProperties = {
  label: string;
  title: string;
  description: string;
  focusItems: readonly string[];
  note: string;
  links: readonly ReferenceLink[];
};

const ReferenceSandboxPage = ({
  label,
  title,
  description,
  focusItems,
  note,
  links,
}: ReferenceSandboxPageProperties) => {
  return (
    <div className="min-h-screen bg-slate-950 px-6 py-8 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-black/20">
          <p className="text-sm font-semibold uppercase tracking-widest text-emerald-300">
            {label}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
            {description}
          </p>
        </section>
        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold text-white">見るポイント</h2>
            <div className="mt-5 space-y-3">
              {focusItems.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <h2 className="text-xl font-semibold text-white">Sivflow での扱い</h2>
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-50">
              {note}
            </div>
          </div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {links.map((link) => (
            <a
              key={link.href}
              className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 text-left transition hover:border-emerald-300/60 hover:bg-slate-900"
              href={link.href}
              rel="noreferrer"
              target="_blank"
            >
              <h2 className="text-lg font-semibold text-white">{link.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{link.description}</p>
            </a>
          ))}
        </section>
      </div>
    </div>
  );
};

export { ReferenceSandboxPage };
export type { ReferenceLink, ReferenceSandboxPageProperties };
