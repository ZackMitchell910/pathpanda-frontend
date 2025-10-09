import { Card } from "./ui/Card";
import React, { useState } from "react";

interface ChallengePanelProps {
  symbol: string;
  actualPrice?: number | null;
  initialUserPrediction?: number | null;
}

export const ChallengePanel: React.FC<ChallengePanelProps> = ({
  symbol,
  actualPrice,
  initialUserPrediction = null,
}) => {
  const [guess, setGuess] = useState<number | "">(
    typeof initialUserPrediction === "number" && Number.isFinite(initialUserPrediction)
      ? initialUserPrediction
      : ""
  );

  const pred = typeof guess === "number" ? guess : null;
  const hasSpot = typeof actualPrice === "number" && Number.isFinite(actualPrice);
  const canScore = hasSpot && typeof pred === "number";

  const scoreText = canScore
    ? Math.abs((pred as number) - (actualPrice as number)) < 5
      ? "Great!"
      : "Try again!"
    : "Enter a prediction to score";

  return (
    <div className="space-y-3">
      <div className="text-sm opacity-80">
        Symbol: <span className="font-mono">{symbol}</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm opacity-80">Your prediction ($):</label>
        <input
          type="number"
          inputMode="decimal"
          className="w-36 rounded-md bg-[#12161b] border border-[#2a2f36] px-3 py-1 text-sm"
          value={guess}
          onChange={(e) => {
            const v = e.currentTarget.value;
            setGuess(v === "" ? "" : Number(v));
          }}
          placeholder="e.g. 123.45"
        />
      </div>

      <div className="text-sm">
        Current price:{" "}
        <span className="font-mono">
          {hasSpot ? `$${(actualPrice as number).toFixed(2)}` : "—"}
        </span>
      </div>

      <div className="text-sm">
        Your prediction:{" "}
        <span className="font-mono">
          {typeof pred === "number" ? `$${pred.toFixed(2)}` : "—"}
        </span>
      </div>

      <div className="text-sm">Score: {scoreText}</div>
    </div>
  );
};
