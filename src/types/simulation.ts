export type SimMode = "quick" | "deep";

export type PathPoint = [number, number];

export interface ModeBand {
  p68_low?: PathPoint[];
  p68_high?: PathPoint[];
  [key: string]: PathPoint[] | undefined;
}

export interface TerminalDensitySummary {
  mode?: number;
  mean?: number;
  median?: number;
  variance?: number;
  hpd?: {
    p50?: [number, number];
    p80?: [number, number];
    p95?: [number, number];
    [key: string]: [number, number] | undefined;
  };
  kde?: {
    x: number[];
    y: number[];
  };
  histogram?: {
    bins: number[];
    counts: number[];
  };
  [key: string]: unknown;
}

export interface TerminalSampleMeta {
  scenario_id?: string;
  weight?: number;
  label?: string;
  color?: string;
  [key: string]: unknown;
}

export interface ScenarioDescriptor {
  id: string;
  label: string;
  weight?: number;
  description?: string;
  narrative?: string;
  drivers?: { feature: string; weight: number }[];
  color?: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface MCArtifact {
  symbol: string;
  horizon_days: number;
  median_path: PathPoint[];
  bands: {
    p50: PathPoint[];
    p80_low: PathPoint[];
    p80_high: PathPoint[];
    p95_low: PathPoint[];
    p95_high: PathPoint[];
  };
  map_path?: PathPoint[];
  most_likely_price?: number;
  mode_band?: ModeBand | null;
  prob_up_end: number;
  drivers: { feature: string; weight: number }[];
  terminal_prices?: number[];
  terminal_density?: TerminalDensitySummary | null;
  terminal_meta?: TerminalSampleMeta[] | null;
  scenarios?: ScenarioDescriptor[] | null;
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
  fan_chart?: {
    q05: number;
    q50: number;
    q95: number;
    prob_up_next?: number;
  };
  features_ref?: {
    window_days: number;
    paths: number;
    S0: number;
    mu_ann: number;
    sigma_ann: number;
    timespan: string;
    seed_hint?: number;
    mode?: SimMode;
  };
  model_info?: {
    engine?: string;
    profile?: SimMode;
    [key: string]: unknown;
  };
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
  profile?: SimMode | null;
}

export interface SimRequestPayload {
  symbol: string;
  mode: SimMode;
  horizon_days: number;
  n_paths: number;
  timespan?: "day" | "hour" | "minute";
  include_news?: boolean;
  include_options?: boolean;
  include_futures?: boolean;
  seed?: number;
  x_handles?: string;
  [key: string]: unknown;
}
