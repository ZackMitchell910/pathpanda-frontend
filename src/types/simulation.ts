export type SimMode = "quick" | "deep";

export interface MCArtifact {
  symbol: string;
  horizon_days: number;
  median_path: [number, number][];
  bands: {
    p50: [number, number][];
    p80_low: [number, number][];
    p80_high: [number, number][];
    p95_low: [number, number][];
    p95_high: [number, number][];
  };
  prob_up_end: number;
  drivers: { feature: string; weight: number }[];
  terminal_prices?: number[];
  var_es?: { var95: number; es95: number };
  hit_probs?: { thresholds_abs: number[]; probs_by_day: number[][] };
  eod_estimate?: {
    day_index: number;
    median: number;
    mean: number;
    p05: number;
    p95: number;
  };
  targets?: {
    spot: number;
    horizon_days: number;
    levels: Array<{
      label: string;
      price: number;
      hitEver?: number;
      hitByEnd?: number;
      tMedDays?: number;
    }>;
  };
  prob_up_next?: number;
  diagnostics?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface RunSummary {
  id: string;
  symbol: string;
  horizon: number;
  n_paths: number;
  finishedAt: string;
  q50?: number | null;
  probUp?: number | null;
}
