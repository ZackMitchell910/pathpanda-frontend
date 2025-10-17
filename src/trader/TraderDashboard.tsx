import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Link } from "react-router-dom";

type SummaryStat = {
  label: string;
  value: string;
  delta: string;
  tone: "positive" | "neutral" | "alert";
};

type StrategyStatusCategory = "Running" | "Paused" | "Alert";

type Strategy = {
  id: string;
  name: string;
  status: string;
  statusCategory: StrategyStatusCategory;
  exchange: "Hyperliquid" | "Coinbase";
  kind: "Momentum" | "Mean Reversion" | "Options" | "Market Making";
  latencyMs: number;
  netPnl: number;
  winRate: number;
  riskUsage: number;
  lastFill: string;
  trend: number[];
};

type TimelineEvent = {
  id: string;
  time: string;
  summary: string;
  meta: string;
  intent: "positive" | "neutral" | "alert";
};

type Metric = {
  label: string;
  value: string;
  tone: "positive" | "neutral" | "alert";
};

const SUMMARY_STATS: SummaryStat[] = [
  {
    label: "Active Strategies",
    value: "3 running",
    delta: "+1 vs yesterday",
    tone: "positive",
  },
  {
    label: "Realized PnL (24h)",
    value: "+$18,420",
    delta: "+4.6%",
    tone: "positive",
  },
  {
    label: "Risk Utilization",
    value: "62%",
    delta: "Under budget",
    tone: "neutral",
  },
  {
    label: "Guardrail Triggers",
    value: "1 halted",
    delta: "Latency spike -> auto throttle",
    tone: "alert",
  },
];

const ACTIVE_STRATEGIES: Strategy[] = [
  {
    id: "hyperliquid-momentum",
    name: "Momentum Pulse",
    status: "Running",
    statusCategory: "Running",
    exchange: "Hyperliquid",
    kind: "Momentum",
    latencyMs: 92,
    netPnl: 12800,
    winRate: 0.54,
    riskUsage: 0.72,
    lastFill: "Bought 200 AAPL @ 187.32",
    trend: [0.18, 0.26, 0.44, 0.38, 0.52, 0.63, 0.7, 0.76],
  },
  {
    id: "coinbase-mean-reversion",
    name: "Mean Reversion Lite",
    status: "Running",
    statusCategory: "Running",
    exchange: "Coinbase",
    kind: "Mean Reversion",
    latencyMs: 128,
    netPnl: -2400,
    winRate: 0.41,
    riskUsage: 0.52,
    lastFill: "Sold 50 NVDA @ 448.18",
    trend: [0.52, 0.46, 0.39, 0.44, 0.41, 0.36, 0.33, 0.29],
  },
  {
    id: "hyperliquid-options",
    name: "Options Hedge",
    status: "Guardrail hold",
    statusCategory: "Alert",
    exchange: "Hyperliquid",
    kind: "Options",
    latencyMs: 0,
    netPnl: 6420,
    winRate: 0.62,
    riskUsage: 0.35,
    lastFill: "Guardrail: gamma threshold hit",
    trend: [0.22, 0.28, 0.34, 0.33, 0.36, 0.42, 0.47, 0.51],
  },
];

const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "evt-1",
    time: "09:31:04",
    summary: "Filled buy 200 AAPL @ 187.32",
    meta: "Momentum Pulse / +$680",
    intent: "positive",
  },
  {
    id: "evt-2",
    time: "09:30:58",
    summary: "Latency spike detected and auto throttled",
    meta: "Options Hedge / Guardrail engaged",
    intent: "alert",
  },
  {
    id: "evt-3",
    time: "09:30:42",
    summary: "Submitted sell 50 NVDA @ 448.18",
    meta: "Mean Reversion Lite / +$312",
    intent: "neutral",
  },
  {
    id: "evt-4",
    time: "09:29:18",
    summary: "Exchange heartbeat confirmed",
    meta: "Hyperliquid / 82 ms ping",
    intent: "neutral",
  },
  {
    id: "evt-5",
    time: "09:28:03",
    summary: "Guardrail reset request approved",
    meta: "Options Hedge / Risk desk override",
    intent: "alert",
  },
];

const ANALYTICS_METRICS: Metric[] = [
  { label: "Net PnL (7d)", value: "+$42,560", tone: "positive" },
  { label: "Sharpe (realized)", value: "1.82", tone: "neutral" },
  { label: "Max Drawdown", value: "-3.2%", tone: "alert" },
  { label: "Hit Rate", value: "58%", tone: "positive" },
  { label: "Avg Trade Duration", value: "14m", tone: "neutral" },
  { label: "Slippage (bps)", value: "3.1", tone: "positive" },
];

const CREDENTIAL_CHECKS = [
  { label: "Exchange API key", state: "OK", hint: "Last rotated 9 days ago" },
  { label: "Websocket connectivity", state: "Stable", hint: "Ping 82 ms" },
  { label: "Risk limits", state: "Synced", hint: "Portfolio guardrails updated" },
  { label: "Webhook delivery", state: "Pending", hint: "1 event queued" },
];

const USAGE_METRICS = [
  { label: "Monthly trade credits", used: 0.68, annotation: "68% used" },
  { label: "Concurrent bots", used: 0.4, annotation: "2 / 5" },
  { label: "Backtest minutes", used: 0.22, annotation: "44 / 200" },
];

const EXCHANGE_OPTIONS = ["All", "Hyperliquid", "Coinbase"] as const;
const STATUS_OPTIONS = ["All", "Running", "Paused", "Alert"] as const;
/**
 * TraderDashboard renders the UX scaffolding for the AI Trader surface.
 * It focuses on composition and visual hierarchy so we can wire live data in
 * a later pass without reworking the view structure.
 */
export default function TraderDashboard() {
  const [exchangeFilter, setExchangeFilter] =
    useState<(typeof EXCHANGE_OPTIONS)[number]>("Hyperliquid");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("All");
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);

  const filteredStrategies = useMemo(() => {
    return ACTIVE_STRATEGIES.filter((strategy) => {
      const exchangeMatch =
        exchangeFilter === "All" ? true : strategy.exchange === exchangeFilter;
      const statusMatch =
        statusFilter === "All"
          ? true
          : statusFilter === "Running"
          ? strategy.statusCategory === "Running"
          : statusFilter === "Paused"
          ? strategy.statusCategory === "Paused"
          : strategy.statusCategory === "Alert";
      return exchangeMatch && statusMatch;
    });
  }, [exchangeFilter, statusFilter]);

  const timelineGroups = useMemo(() => {
    return {
      events: TIMELINE_EVENTS.filter((item) => item.intent !== "alert"),
      alerts: TIMELINE_EVENTS.filter((item) => item.intent === "alert"),
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#040607] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 lg:px-12">
        <Header />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SUMMARY_STATS.map((stat) => (
            <Card
              key={stat.label}
              className="border-white/10 bg-[#0a0d0f]"
            >
              <CardHeader className="pb-3">
                <div className="text-xs uppercase tracking-wide text-white/40">{stat.label}</div>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 pt-0">
                <div className="text-lg font-semibold">{stat.value}</div>
                <div
                  className={`text-xs ${
                    stat.tone === "positive"
                      ? "text-[#7bc89d]"
                      : stat.tone === "alert"
                      ? "text-amber-300"
                      : "text-white/70"
                  }`}
                >
                  {stat.delta}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px,1fr]">
          <aside className="flex flex-col gap-6">
            <UsageQuota />
          </aside>

          <main className="flex flex-col gap-6">
            <ActiveStrategies
              strategies={filteredStrategies}
              total={ACTIVE_STRATEGIES.length}
              exchangeFilter={exchangeFilter}
              statusFilter={statusFilter}
              onExchangeChange={setExchangeFilter}
              onStatusChange={setStatusFilter}
              onSelectStrategy={setSelectedStrategy}
            />
            <ExecutionTimeline events={timelineGroups.events} alerts={timelineGroups.alerts} />
            <PostTradeAnalytics />
          </main>
        </div>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <StrategyLauncher />
          <CredentialHealth />
        </section>
      </div>

      <StrategyDetailDrawer
        strategy={selectedStrategy}
        onClose={() => setSelectedStrategy(null)}
      />
    </div>
  );
}

function Header() {
  return (
    <header className="flex flex-col gap-3">
      <span className="text-xs uppercase tracking-[0.28em] text-white/40">
        Simetrix // Trader
      </span>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold sm:text-4xl">AI Trader</h1>
          <p className="max-w-2xl text-sm text-white/60">
            Launch automated strategies, monitor live execution, and review trade analytics in a
            single control surface. API wiring will drop into this shell next.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-white/10 bg-[#0a0d0f] px-4 py-3 text-right">
            <div className="text-[0.65rem] uppercase tracking-wide text-white/40">Release</div>
            <div className="text-sm font-semibold text-white">v0.1 / Alpha</div>
          </div>
          <Link
            to="/docs/trader"
            className="rounded-xl border border-white/20 bg-[#0c1012] px-4 py-2 text-sm font-medium text-white hover:border-white/30 hover:bg-[#151a1d]"
          >
            View Docs
          </Link>
        </div>
      </div>
    </header>
  );
}
function StrategyLauncher() {
  return (
    <Card className="border-white/10 bg-[#090b0d] shadow-[0_28px_80px_-60px_rgba(0,0,0,0.6)]">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Strategy Launcher</h2>
            <p className="mt-1 text-xs text-white/60">
              Configure guardrails, execution venues, and scheduling presets. Form wiring will
              connect into backend hooks later.
            </p>
          </div>
          <button className="rounded-lg border border-white/15 bg-[#0c1012] px-3 py-1.5 text-xs text-white hover:border-white/25 hover:bg-[#151a1d]">
            Create Preset
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <PlaceholderField label="Primary symbol or basket" />
        <PlaceholderField label="Strategy template" />
        <PlaceholderField label="Risk budget / guardrails" />
        <PlaceholderField label="Execution window" />
        <div className="rounded-xl border border-dashed border-white/10 bg-[#101214] p-4 text-xs text-white/50">
          Attachments for backtest links, compliance notes, and scenario guardrails will render in
          this zone.
        </div>
      </CardContent>
    </Card>
  );
}

function PlaceholderField({ label }: { label: string }) {
  return (
    <div className="space-y-2">
      <div className="text-[0.7rem] uppercase tracking-wide text-white/40">{label}</div>
      <div className="h-10 rounded-lg border border-white/10 bg-[#0a0d0f]" />
    </div>
  );
}

function CredentialHealth() {
  return (
    <Card className="border-white/10 bg-[#090b0d] shadow-[0_28px_80px_-60px_rgba(0,0,0,0.6)]">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Credential Health</h2>
          <span className="rounded-full border border-[#3d6550]/40 bg-[#131d17] px-3 py-1 text-[0.65rem] font-medium uppercase tracking-widest text-[#7bc89d]">
            Passing
          </span>
        </div>
        <p className="mt-1 text-xs text-white/60">
          Quick glance on exchange connectivity, key rotation, and delivery SLAs.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0 text-sm text-white/70">
        {CREDENTIAL_CHECKS.map((check) => (
          <div
            key={check.label}
            className="flex flex-col gap-0.5 rounded-xl border border-white/10 bg-[#0a0d0f] px-3 py-2.5"
          >
            <div className="flex items-center justify-between text-sm text-white">
              <span>{check.label}</span>
              <span className="text-xs text-[#7bc89d]">{check.state}</span>
            </div>
            <div className="text-xs text-white/45">{check.hint}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function UsageQuota() {
  return (
    <Card className="border-white/10 bg-[#090b0d] shadow-[0_28px_80px_-60px_rgba(0,0,0,0.6)]">
      <CardHeader className="pb-2">
        <h2 className="text-sm font-semibold">Usage &amp; Quota</h2>
        <p className="mt-1 text-xs text-white/60">
          Mirrors the shared quota service so teams can coordinate consumption across products.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {USAGE_METRICS.map((metric) => (
          <div key={metric.label} className="space-y-2">
            <div className="flex items-center justify-between text-xs text-white/50">
              <span>{metric.label}</span>
              <span>{metric.annotation}</span>
            </div>
            <div className="h-2 rounded-full bg-[#111315]">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-[#2b4733] via-[#22392c] to-[#1a2a21]"
                style={{ width: `${Math.round(metric.used * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
function ActiveStrategies({
  strategies,
  total,
  exchangeFilter,
  statusFilter,
  onExchangeChange,
  onStatusChange,
  onSelectStrategy,
}: {
  strategies: Strategy[];
  total: number;
  exchangeFilter: (typeof EXCHANGE_OPTIONS)[number];
  statusFilter: (typeof STATUS_OPTIONS)[number];
  onExchangeChange: (value: (typeof EXCHANGE_OPTIONS)[number]) => void;
  onStatusChange: (value: (typeof STATUS_OPTIONS)[number]) => void;
  onSelectStrategy: (strategy: Strategy) => void;
}) {
  return (
    <Card className="border-white/10 bg-[#090b0d] shadow-[0_28px_80px_-60px_rgba(0,0,0,0.6)]">
      <CardHeader className="flex flex-wrap items-start justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold">Live Execution Monitor</h2>
            <span className="rounded-full border border-white/10 bg-[#0a0d0f] px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-white/60">
              {strategies.length} of {total} shown
            </span>
          </div>
          <p className="text-xs text-white/60">
            Track fills, guardrail triggers, and risk budgets across active strategies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-white/15 bg-[#0c1012] px-3 py-1.5 text-xs text-white hover:border-white/25 hover:bg-[#151a1d]">
            Pause All
          </button>
          <button className="rounded-lg border border-white/15 bg-[#0c1012] px-3 py-1.5 text-xs text-white hover:border-white/25 hover:bg-[#151a1d]">
            New Strategy
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">
        <MonitorFilters
          exchangeFilter={exchangeFilter}
          statusFilter={statusFilter}
          onExchangeChange={onExchangeChange}
          onStatusChange={onStatusChange}
        />

        <div className="grid gap-3 lg:grid-cols-2">
          {strategies.map((strategy) => (
            <StrategyCard
              key={strategy.id}
              strategy={strategy}
              onSelect={() => onSelectStrategy(strategy)}
            />
          ))}
        </div>

        {strategies.length === 0 ? <StrategyEmptyState /> : null}
      </CardContent>
    </Card>
  );
}

function MonitorFilters({
  exchangeFilter,
  statusFilter,
  onExchangeChange,
  onStatusChange,
}: {
  exchangeFilter: (typeof EXCHANGE_OPTIONS)[number];
  statusFilter: (typeof STATUS_OPTIONS)[number];
  onExchangeChange: (value: (typeof EXCHANGE_OPTIONS)[number]) => void;
  onStatusChange: (value: (typeof STATUS_OPTIONS)[number]) => void;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <FilterGroup
        label="Exchange"
        options={EXCHANGE_OPTIONS}
        active={exchangeFilter}
        onSelect={onExchangeChange}
      />
      <FilterGroup
        label="Status"
        options={STATUS_OPTIONS}
        active={statusFilter}
        onSelect={onStatusChange}
      />
    </div>
  );
}

function FilterGroup<T extends string>({
  label,
  options,
  active,
  onSelect,
}: {
  label: string;
  options: readonly T[];
  active: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="uppercase tracking-wide text-white/40">{label}</span>
      <div className="flex items-center gap-1">
        {options.map((option) => (
          <FilterPill
            key={option}
            label={option}
            active={option === active}
            onClick={() => onSelect(option)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-[#3d6550]/40 bg-[#141d17] text-white"
          : "border-white/10 bg-[#0c1012] text-white/60 hover:border-white/20 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
function StrategyCard({ strategy, onSelect }: { strategy: Strategy; onSelect: () => void }) {
  const pnlColor = strategy.netPnl >= 0 ? "text-[#7bc89d]" : "text-rose-300";
  const winRateColor = strategy.winRate >= 0.5 ? "text-[#7bc89d]" : "text-amber-300";

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      className="group flex flex-col rounded-2xl border border-white/10 bg-[#0a0d0f] p-4 text-left"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{strategy.name}</div>
          <div className="mt-1 text-xs text-white/50">
            {strategy.exchange} / {strategy.kind}
          </div>
        </div>
        <StatusBadge status={strategy.status} category={strategy.statusCategory} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-white/40">Net PnL</div>
          <div className={`mt-1 text-base font-semibold ${pnlColor}`}>
            {formatNetPnl(strategy.netPnl)}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Sparkline data={strategy.trend} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-white/60">
        <div>
          <div className="text-white/40">Latency</div>
          <div className="mt-0.5 text-white">
            {strategy.latencyMs ? `${strategy.latencyMs} ms` : "n/a"}
          </div>
        </div>
        <div>
          <div className="text-white/40">Win Rate</div>
          <div className={`mt-0.5 ${winRateColor}`}>
            {Math.round(strategy.winRate * 100)}%
          </div>
        </div>
        <div className="col-span-2">
          <div className="text-white/40">Risk Usage</div>
          <RiskMeter value={strategy.riskUsage} />
        </div>
      </div>

      <div className="mt-4 text-xs text-white/50">{strategy.lastFill}</div>
    </motion.button>
  );
}

function StatusBadge({
  status,
  category,
}: {
  status: string;
  category: StrategyStatusCategory;
}) {
  const palette =
    category === "Running"
      ? "border-[#3d6550]/40 bg-[#141d17] text-[#7bc89d]"
      : category === "Paused"
      ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
      : "border-rose-400/40 bg-rose-500/10 text-rose-200";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${palette}`}
    >
      {status}
    </span>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (!data.length) {
    return <div className="h-8 w-24 rounded bg-[#0a0d0f]" />;
  }

  const width = 120;
  const height = 38;
  const paddingX = 4;
  const paddingY = 6;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? (width - paddingX * 2) / (data.length - 1) : 0;

  const points = data.map((value, index) => {
    const x = paddingX + index * step;
    const y = height - paddingY - ((value - min) / range) * (height - paddingY * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const last = points[points.length - 1]?.split(",") ?? ["0", "0"];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="text-[#6abf8b]">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points.join(" ")}
      />
      <circle cx={last[0]} cy={last[1]} r="3" fill="currentColor" />
    </svg>
  );
}

function RiskMeter({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(1, value));

  return (
    <div className="mt-1">
      <div className="h-2 rounded-full bg-[#111315]">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-[#2b4733] via-[#22392c] to-[#1a2a21]"
          style={{ width: `${Math.round(safeValue * 100)}%` }}
        />
      </div>
      <div className="mt-1 text-right text-[0.65rem] uppercase tracking-wide text-white/40">
        {Math.round(safeValue * 100)}% used
      </div>
    </div>
  );
}

function StrategyEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0c1012] px-6 py-12 text-center text-sm text-white/50">
      <div className="text-base font-medium text-white/70">No strategies match this filter</div>
      <p className="mt-2 max-w-sm text-xs text-white/50">
        Adjust the exchange or status filters, or spin up a new Hyperliquid bot to populate this
        view.
      </p>
    </div>
  );
}
function StrategyDetailDrawer({
  strategy,
  onClose,
}: {
  strategy: Strategy | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {strategy ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-end bg-black/70 backdrop-blur-sm md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="h-full w-full max-w-md overflow-y-auto border-l border-white/10 bg-[#0b141c] p-6 shadow-2xl md:h-auto md:max-h-[80vh] md:rounded-2xl md:border md:border-white/10"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 32 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-wide text-white/40">
                  Strategy detail
                </div>
                <h3 className="mt-1 text-lg font-semibold">{strategy.name}</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/10 bg-[#0c1012] px-3 py-1 text-xs text-white/60 hover:border-white/20 hover:text-white"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-[#0a0d0f] p-3">
              <div className="text-xs text-white/50">
                {strategy.exchange} / {strategy.kind}
              </div>
              <div className="mt-2">
                <Sparkline data={strategy.trend} />
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 text-sm text-white/70">
              <DetailMetric label="Net PnL" value={formatNetPnl(strategy.netPnl)} />
              <DetailMetric label="Win rate" value={`${Math.round(strategy.winRate * 100)}%`} />
              <DetailMetric
                label="Latency"
                value={strategy.latencyMs ? `${strategy.latencyMs} ms` : "n/a"}
              />
              <DetailMetric
                label="Risk usage"
                value={`${Math.round(strategy.riskUsage * 100)}% of budget`}
              />
            </dl>

            <div className="mt-6 space-y-3">
              <div className="text-xs uppercase tracking-wide text-white/40">Recent activity</div>
              <div className="rounded-xl border border-white/10 bg-[#0a0d0f] p-3 text-xs text-white/60">
                {strategy.lastFill}
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0a0d0f] p-3 text-xs text-white/60">
                Guardrails, execution venues, and credential metadata will render here once wired
                to the trading API.
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="text-xs uppercase tracking-wide text-white/40">Runbook</div>
              <ul className="space-y-2 text-xs text-white/55">
                <li>
                  <span className="text-white/80">Latency &gt; 500 ms:</span> auto throttle engages; operators can request
                  reset after phase shifts to <code className="rounded bg-white/10 px-1">guardrail_halt</code>.
                </li>
                <li>
                  <span className="text-white/80">Credential drift:</span> poll <code className="rounded bg-white/10 px-1">/trader/health</code>;
                  any failures mirror in the credential card and should be resolved before relaunch.
                </li>
                <li>
                  <span className="text-white/80">Playbook:</span> reference the{" "}
                  <Link to="/docs/trader" className="text-[#7bc89d] underline-offset-2 hover:underline">
                    Trader integration notes
                  </Link>{" "}
                  for endpoint schemas and websocket rollout status.
                </li>
              </ul>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0d0f] p-3">
      <div className="text-xs uppercase tracking-wide text-white/40">{label}</div>
      <div className="mt-1 text-sm text-white">{value}</div>
    </div>
  );
}
function ExecutionTimeline({ events, alerts }: { events: TimelineEvent[]; alerts: TimelineEvent[] }) {
  return (
    <Card className="border-white/10 bg-[#090b0d] shadow-[0_28px_80px_-60px_rgba(0,0,0,0.6)]">
      <CardHeader className="pb-2">
        <h2 className="text-sm font-semibold">Execution Timeline</h2>
        <p className="mt-1 text-xs text-white/60">
          Split feed highlights routine activity versus alerts so operators can react faster.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 pt-0 md:grid-cols-2">
        <TimelineColumn title="Events" items={events} emptyLabel="No recent events." />
        <TimelineColumn title="Alerts" items={alerts} emptyLabel="Standing guardrail is quiet." />
      </CardContent>
    </Card>
  );
}

function TimelineColumn({
  title,
  items,
  emptyLabel,
}: {
  title: string;
  items: TimelineEvent[];
  emptyLabel: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0a0d0f] p-4">
      <div className="text-xs uppercase tracking-wide text-white/40">{title}</div>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 bg-[#0c1012] px-4 py-6 text-xs text-white/50">
          {emptyLabel}
        </div>
      ) : (
        items.map((event) => <TimelineEventRow key={event.id} event={event} />)
      )}
    </div>
  );
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const toneClass =
    event.intent === "positive"
      ? "bg-[#6abf8b]"
      : event.intent === "alert"
      ? "bg-amber-300"
      : "bg-[#c1c7cd]";

  return (
    <motion.div
      className="flex items-start gap-3 rounded-xl border border-white/10 bg-[#0a0d0f] p-3 text-sm text-white"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 240, damping: 18 }}
    >
      <div className={`mt-1 h-2 w-2 rounded-full ${toneClass}`} />
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between text-[0.7rem] uppercase tracking-wide text-white/40">
          <span>{event.time}</span>
          <span>{event.meta}</span>
        </div>
        <div>{event.summary}</div>
      </div>
    </motion.div>
  );
}

function PostTradeAnalytics() {
  return (
    <Card className="border-white/10 bg-[#090b0d] shadow-[0_28px_80px_-60px_rgba(0,0,0,0.6)]">
      <CardHeader className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <h2 className="text-sm font-semibold">Post-Trade Analytics</h2>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-white/15 bg-[#0c1012] px-3 py-1.5 text-xs text-white hover:border-white/25 hover:bg-[#151a1d]">
            Export CSV
          </button>
          <button className="rounded-lg border border-white/15 bg-[#0c1012] px-3 py-1.5 text-xs text-white hover:border-white/25 hover:bg-[#151a1d]">
            Open Notebook
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-0">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ANALYTICS_METRICS.map((metric) => (
            <AnalyticsStat key={metric.label} metric={metric} />
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0a0d0f] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Risk Distribution</h3>
              <p className="mt-1 text-xs text-white/60">
                Placeholder canvas for VaR or CVaR curves once analytics are wired.
              </p>
            </div>
            <button className="rounded-lg border border-white/15 bg-[#0c1012] px-3 py-1.5 text-xs text-white hover:border-white/25 hover:bg-[#151a1d]">
              Compare Runs
            </button>
          </div>
          <div className="mt-4 h-48 rounded-2xl border border-dashed border-white/10 bg-[#101214]" />
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticsStat({ metric }: { metric: Metric }) {
  const color =
    metric.tone === "positive"
      ? "text-[#7bc89d]"
      : metric.tone === "alert"
      ? "text-rose-300"
      : "text-white";

  return (
    <div className="rounded-xl border border-white/10 bg-[#0a0d0f] p-4">
      <div className="text-xs uppercase tracking-wide text-white/40">{metric.label}</div>
      <div className={`mt-2 text-lg font-semibold ${color}`}>{metric.value}</div>
    </div>
  );
}

function formatNetPnl(value: number) {
  const abs = Math.abs(value);
  const sign = value >= 0 ? "+" : "-";

  if (abs >= 1000000) {
    return `${sign}$${(abs / 1000000).toFixed(1)}m`;
  }

  if (abs >= 1000) {
    return `${sign}$${(abs / 1000).toFixed(1)}k`;
  }

  return `${sign}$${abs.toFixed(0)}`;
}




















