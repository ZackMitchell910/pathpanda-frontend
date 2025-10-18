import React, { useCallback } from "react";
import toast from "react-hot-toast";

type NumOrEmpty = number | "";

type Props = {
  symbol: string;
  setSymbol: (v: string) => void;

  horizon: NumOrEmpty;
  setHorizon: (v: NumOrEmpty) => void;

  paths: number;
  setPaths: (v: number) => void;

  includeOptions: boolean;
  setIncludeOptions: (v: boolean) => void;

  includeFutures: boolean;
  setIncludeFutures: (v: boolean) => void;

  includeNews: boolean;
  setIncludeNews: (v: boolean) => void;

  xHandles: string;
  setXHandles: (v: string) => void;

  apiKey: string;
  setApiKey: (v: string) => void;

  showApiKey: boolean;
  setShowApiKey: (v: boolean) => void;

  isTraining: boolean;
  isPredicting: boolean;
  isSimulating: boolean;

  onPreset: (p: { symbol: string; horizon: number; paths: number }) => void;
  onRunSimulation: () => void;
  onTrainModel: () => void;
  onRunPredict: () => void;
  onLabelNow: () => void;
  onLearnNow: () => void;
};

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="text-xs font-medium text-zinc-300">{children}</label>
);

const TextInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  className = "",
  ...rest
}) => (
  <input
    {...rest}
    className={`w-full rounded-lg bg-[#0E141C] border border-[#273141] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-sky-500 ${className}`}
  />
);

const Checkbox: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({
  children,
  ...rest
}) => (
  <label className="flex items-center gap-2 text-sm text-zinc-300">
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-[#273141] bg-[#0E141C] text-sky-500 focus:ring-sky-500"
      {...rest}
    />
    {children}
  </label>
);

const Btn: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "neutral" | "warning";
    busy?: boolean;
  }
> = ({ variant = "neutral", busy = false, className = "", children, ...rest }) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm border transition-colors disabled:opacity-60 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-emerald-500/90 text-black border-emerald-400 hover:bg-emerald-400"
      : variant === "warning"
      ? "bg-amber-500/90 text-black border-amber-400 hover:bg-amber-400"
      : "bg-[#131A23] text-zinc-200 border-[#273141] hover:bg-[#192230]";
  return (
    <button {...rest} className={`${base} ${styles} ${className}`} aria-busy={busy}>
      {busy && (
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" className="opacity-20" stroke="currentColor" strokeWidth="4" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" className="opacity-90" />
        </svg>
      )}
      {children}
    </button>
  );
};

export const SimulationControls: React.FC<Props> = ({
  symbol,
  setSymbol,
  horizon,
  setHorizon,
  paths,
  setPaths,
  includeOptions,
  setIncludeOptions,
  includeFutures,
  setIncludeFutures,
  includeNews,
  setIncludeNews,
  xHandles,
  setXHandles,
  apiKey,
  setApiKey,
  showApiKey,
  setShowApiKey,
  isTraining,
  isPredicting,
  isSimulating,
  onPreset,        // (kept for compatibility; not rendered here)
  onRunSimulation,
  onTrainModel,
  onRunPredict,
  onLabelNow,
  onLearnNow,
}) => {
  // --- helpers ---
  const horizonNum = typeof horizon === "number" ? horizon : Number.NaN;
  const apiKeyTrim = (apiKey || "").trim();
  const disabledAPI = !apiKeyTrim || apiKeyTrim.toLowerCase().includes("error");

  const disabledSim =
    isSimulating ||
    !symbol ||
    !Number.isFinite(horizonNum) ||
    horizonNum <= 0 ||
    paths <= 0;

  const tryRunSimulation = useCallback(() => {
    if (disabledAPI) {
      toast.error("Enter a valid API key first.");
      return;
    }
    if (disabledSim) {
      toast.error("Check symbol, horizon, and paths.");
      return;
    }
    onRunSimulation();
  }, [disabledAPI, disabledSim, onRunSimulation]);

  const onEnterTryRun = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      tryRunSimulation();
    }
  };

  return (
    <div className="rounded-xl bg-[#0B0E12] border border-[#1F2937] p-4">
      {/* Row: ticker + params */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <FieldLabel>Ticker</FieldLabel>
          <TextInput
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            onKeyDown={onEnterTryRun}
            placeholder="NVDA"
            spellCheck={false}
          />
        </div>

        <div>
          <FieldLabel>Horizon (days)</FieldLabel>
          <TextInput
            type="number"
            min={1}
            step={1}
            value={horizon}
            onChange={(e) => {
              const v = e.target.value.trim();
              if (v === "") {
                setHorizon("");
              } else {
                const n = Number(v);
                setHorizon(Number.isFinite(n) ? n : "");
              }
            }}
            onKeyDown={onEnterTryRun}
            placeholder="30"
            inputMode="numeric"
          />
        </div>

        <div>
          <FieldLabel>Paths</FieldLabel>
          <TextInput
            type="number"
            min={100}
            step={100}
            value={Number.isFinite(paths) ? paths : 0}
            onChange={(e) => {
              const n = Number(e.target.value);
              setPaths(Number.isFinite(n) ? n : 0);
            }}
            onKeyDown={onEnterTryRun}
            placeholder="2000"
            inputMode="numeric"
          />
        </div>

        <div>
          <FieldLabel>X handles (optional)</FieldLabel>
          <TextInput
            value={xHandles}
            onChange={(e) => setXHandles(e.target.value)}
            onKeyDown={onEnterTryRun}
            placeholder="@elonmusk, @nvidia"
          />
        </div>

        <div>
          <FieldLabel>API Key</FieldLabel>
          <div className="flex gap-2">
            <TextInput
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="PT_API_KEY or POLYGON_KEY"
              className="flex-1"
            />
            <Btn onClick={() => setShowApiKey(!showApiKey)} className="px-2 py-2" aria-label="Toggle API key visibility">
              {showApiKey ? "Hide" : "Show"}
            </Btn>
          </div>
        </div>
      </div>

      {/* Row: switches */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Checkbox checked={includeNews} onChange={(e) => setIncludeNews(e.target.checked)}>
          Include News
        </Checkbox>
        <Checkbox checked={includeOptions} onChange={(e) => setIncludeOptions(e.target.checked)}>
          Include Options
        </Checkbox>
        <Checkbox checked={includeFutures} onChange={(e) => setIncludeFutures(e.target.checked)}>
          Include Futures
        </Checkbox>
      </div>

      {/* Row: actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Btn
          variant="primary"
          onClick={tryRunSimulation}
          disabled={disabledSim || disabledAPI}
          busy={isSimulating}
          aria-label="Run simulation"
          title="Run a Simetrix Quant Engine (SQE) simulation"
        >
          Run Simulation
        </Btn>

        <Btn
          onClick={() => {
            if (disabledAPI) {
              toast.error("Enter a valid API key first.");
              return;
            }
            onRunPredict();
          }}
          disabled={isPredicting || disabledAPI}
          busy={isPredicting}
          aria-label="Run prediction"
          title="Run model prediction"
        >
          Run Predict
        </Btn>

        <Btn
          onClick={() => {
            if (disabledAPI) {
              toast.error("Enter a valid API key first.");
              return;
            }
            onTrainModel();
          }}
          disabled={isTraining || disabledAPI}
          busy={isTraining}
          aria-label="Train model"
          title="Train/refresh models"
        >
          Train Model
        </Btn>

        <Btn onClick={onLabelNow} disabled={disabledAPI} aria-label="Label matured outcomes" title="Label matured outcomes">
          Label Now
        </Btn>

        <Btn onClick={onLearnNow} disabled={disabledAPI} aria-label="Online learn (SGD)" variant="warning" title="Online learning update">
          Learn Now
        </Btn>
      </div>
    </div>
  );
};

export default SimulationControls;
