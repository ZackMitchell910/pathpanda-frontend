// src/components/DailyQuantCard.tsx
import React, { useEffect, useState } from "react";


export default function DailyQuantCard({ apiBase, getHeaders, onOpen }: {
apiBase: string; // e.g., API_BASE from App.tsx
getHeaders: () => Record<string,string>; // e.g., apiHeaders(apiKey)
onOpen: (symbol: string, horizon: number) => void; // setSymbol+setHorizon
}) {
const [data, setData] = useState<any>(null);
const [loading, setLoading] = useState(false);
const [err, setErr] = useState<string|undefined>();
useEffect(() => { (async () => {
try {
setLoading(true); setErr(undefined);
const r = await fetch(`${apiBase}/quant/daily/today`, { headers: getHeaders() });
const js = await r.json(); if (!r.ok) throw new Error(js?.detail || r.statusText);
setData(js);
} catch(e:any){ setErr(e?.message||String(e)); }
finally { setLoading(false); }
})(); }, [apiBase]);


if (loading) return <div className="text-xs opacity-70">Loading daily quant pick…</div>;
if (err) return <div className="text-xs text-rose-400">{err}</div>;
if (!data) return null;
const sec = data.equity, cr = data.crypto;
const Item = ({it, label}:{it:any, label:string}) => it ? (
<div className="p-3 rounded-xl border border-white/10 bg-white/5">
<div className="text-xs opacity-70">{label}</div>
<div className="text-lg font-semibold">{it.symbol}</div>
<div className="text-xs opacity-80">P(up) {Math.round((it.prob_up_end||0)*100)}% · median {Math.round(it.median_return_pct||0)}% · {it.horizon_days}d</div>
<div className="mt-1 text-sm opacity-85">{it.blurb}</div>
<button onClick={() => onOpen(it.symbol, it.horizon_days||30)} className="mt-2 text-xs underline">Open in Simulator</button>
</div>
) : null;


return (
<section className="grid gap-3 md:grid-cols-2">
<Item it={sec} label="Equity" />
<Item it={cr} label="Crypto" />
</section>
);
}
