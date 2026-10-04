'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BagViewer } from '@/components/BagViewer';
import { colorsFor, stylistPick } from '@/lib/catalog';
import { money } from '@/lib/money';
import { useShop } from '@/lib/store';

const QUESTIONS = [
  { n: 'I', t: 'What are you carrying?', opts: ['A laptop and a life', 'Cards, phone, keys', 'Everything, always'] },
  { n: 'II', t: 'Where does it live?', opts: ['Boardrooms and airports', 'Pavements and platforms', 'Evenings out'] },
  { n: 'III', t: 'How quiet?', opts: ['It should disappear', 'It should arrive first'] },
];

const WORDS = ['None', 'One', 'Two', 'Three'];

export function StylistView() {
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const config = useShop((s) => s.config);
  const answered = answers.filter((a) => a !== null).length;
  const [a, b, c] = answers;
  const pick = a !== null && b !== null && c !== null ? stylistPick(a, b, c) : null;

  return (
    <section className="wrap page">
      <div className="kicker">Three questions</div>
      <h1 className="h1-page" style={{ maxWidth: '22ch', marginBottom: 30 }}>Tell us how you leave the house.</h1>
      <hr className="hr" />
      <div className="split split-stylist">
        <div>
          {QUESTIONS.map((q, qi) => (
            <fieldset key={q.n} className="q" style={{ border: 0, padding: 0, margin: '0 0 34px' }}>
              <legend className="q-head" style={{ padding: 0 }}>
                <span className="n tnum">{q.n}</span>
                <h3>{q.t}</h3>
              </legend>
              <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {q.opts.map((label, oi) => (
                  <button
                    key={label}
                    role="radio"
                    aria-checked={answers[qi] === oi}
                    className="opt"
                    onClick={() => setAnswers(answers.map((x, i) => (i === qi ? oi : x)))}
                  >
                    <span className={answers[qi] === oi ? 'radio-dot on' : 'radio-dot'} />
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
        <div aria-live="polite">
          {pick ? (
            <div className="fade-up" key={pick.id}>
              <div className="label" style={{ marginBottom: 14 }}>Our recommendation</div>
              <div className="stage3d" style={{ height: 300, marginBottom: 18 }}>
                <BagViewer spec={pick.spec3d} colors={colorsFor(config.leather, config.hardware)} label={`${pick.name}, 3D model`} />
              </div>
              <h2 style={{ fontWeight: 400, marginBottom: 8 }}>{pick.name}</h2>
              <div className="serif tnum" style={{ fontSize: 24, marginBottom: 12 }}>{money(pick.priceEur)}</div>
              <p className="justify">
                It carries what you said you carry, it holds its shape where you said you go, and the finish sits where you
                pointed. Turn it above, and change the hide if you disagree.
              </p>
              <div className="btn-row" style={{ gap: 12, marginTop: 6 }}>
                <Link className="btn btn-primary" style={{ padding: '12px 20px' }} href={`/products/${pick.id}`}>Specify this one</Link>
                <button className="btn btn-ghost" onClick={() => setAnswers([null, null, null])}>Start again</button>
              </div>
            </div>
          ) : (
            <div className="card" style={{ padding: 30 }}>
              <h3 style={{ fontWeight: 400, marginBottom: 8 }}>Answer the three</h3>
              <p className="muted" style={{ margin: 0 }}>
                {WORDS[answered]} of three answered. We recommend one bag only, and we will not hedge.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
