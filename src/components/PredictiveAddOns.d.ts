declare module "./components/PredictiveAddOns" {
  import * as React from "react";

  // -------- Shared types --------
  export type Artifact = {
    symbol: string;
    horizon_days: number;
    median_path: [number, number][];
    bands: {
      p05?: [number, number][];
      p50: [number, number][];
      p95?: [number, number][];
    };
    prob_up_end?: number;
    drivers?: { name: string; weight: number }[];
  };

  // -------- Components & Props --------

  // 1) TerminalDistribution
  export interface TerminalDistributionProps {
    pathsTerminal: number[]; // one terminal price per simulated path
    ptiles?: { p05?: number; p50?: number; p95?: number };
  }
  export const TerminalDistribution: React.FC<TerminalDistributionProps>;

  // 2) HitProbabilityRibbon
  export interface HitProbabilityRibbonProps {
    artifact: Artifact;
    thresholds: number[];        // if thresholdsAbs=false, treat as returns (-0.05 = -5%)
    thresholdsAbs?: boolean;     // default false (relative-to-S0 %)
    S0: number;                  // current spot used for relative thresholds
    pathMatrixAbove: (tIndex: number, thresholdAbs: number) => number; // returns 0..1
  }
  export const HitProbabilityRibbon: React.FC<HitProbabilityRibbonProps>;

  // 3) TargetLadder (if you decide to import this one later)
  export interface TargetLadderProps {
    probs: { label: string; p: number }[]; // 0..1
  }
  export const TargetLadder: React.FC<TargetLadderProps>;

  // 4) ScenarioTiles
  export interface ScenarioTilesProps {
    artifact: Artifact;
    reps: { label: string; path: [number, number][] }[]; // bear/base/bull representative paths
  }
  export const ScenarioTiles: React.FC<ScenarioTilesProps>;

  // 5) RiskDials
  export interface RiskDialsProps {
    var95: number; // your chosen units (%, or $); component just displays
    es95: number;  // same units as var95
  }
  export const RiskDials: React.FC<RiskDialsProps>;

  // 6) DriversWaterfall
  export interface DriversWaterfallProps {
    drivers: { name: string; weight: number }[]; // positive/negative contributions
  }
  export const DriversWaterfall: React.FC<DriversWaterfallProps>;

  // 7) CalibrationPanel (exported in the module; include for completeness)
  export interface CalibrationPanelProps {
    pitBins: number[]; // PIT histogram counts
    coverage: { label: string; intended: number; empirical: number }[];
  }
  export const CalibrationPanel: React.FC<CalibrationPanelProps>;

  // 8) OptionsMiniBoard (exported)
  export interface OptionsMiniBoardProps {
    ivAvg: number;
    skew?: number;
    topOI?: { contract: string; oi: number; iv?: number }[];
  }
  export const OptionsMiniBoard: React.FC<OptionsMiniBoardProps>;

  // 9) FuturesCurve (exported)
  export interface FuturesCurveProps {
    series: { label: string; price: number }[];
    spot?: number;
  }
  export const FuturesCurve: React.FC<FuturesCurveProps>;

  // 10) SentimentStrip (exported)
  export interface SentimentStripProps {
    values: number[];    // -1..1 or 0..1
    labels?: string[];
  }
  export const SentimentStrip: React.FC<SentimentStripProps>;

  // 11) RegimeMap (exported)
  export interface RegimeMapProps {
    points: { mu: number; sigma: number; label?: string }[];
    currentIx?: number;
  }
  export const RegimeMap: React.FC<RegimeMapProps>;

  // 12) ConeVsRealized (exported)
  export interface ConeVsRealizedProps {
    labels: string[]; // D0..Dk
    p05: number[];
    p50: number[];
    p95: number[];
    realized: number[];
  }
  export const ConeVsRealized: React.FC<ConeVsRealizedProps>;

  // Demo wrapper (exported)
  export interface PredictiveAddOnsDemoProps {
    artifact: Artifact;
    S0: number;
    pathsTerminal: number[];
    percentileAtH: { p05?: number; p50?: number; p95?: number };
    pathMatrixAbove: (tIndex: number, thresholdAbs: number) => number;
    targetLadder: { label: string; p: number }[];
    scenarioReps: { label: string; path: [number, number][] }[];
    var95: number;
    es95: number;
    drivers: { name: string; weight: number }[];
    pitBins: number[];
    coverage: { label: string; intended: number; empirical: number }[];
    options: { ivAvg: number; skew?: number; topOI?: { contract: string; oi: number; iv?: number }[] };
    futures: { series: { label: string; price: number }[]; spot?: number };
    sentiment: number[];
    regime: { points: { mu: number; sigma: number; label?: string }[]; currentIx?: number };
    realizedOverlay?: { labels: string[]; p05: number[]; p50: number[]; p95: number[]; realized: number[] };
  }
  export const PredictiveAddOnsDemo: React.FC<PredictiveAddOnsDemoProps>;
}