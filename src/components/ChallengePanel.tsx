// src/components/ChallengePanel.tsx
import React from "react";
import { Card } from "./ui/Card";

interface ChallengePanelProps {
  symbol: string;
  userPrediction: number;
  actualPrice?: number;
}

export const ChallengePanel: React.FC<ChallengePanelProps> = ({ symbol, userPrediction, actualPrice }) => (
  <Card title="Prediction Challenge" collapsible>
    <div className="text-sm">
      <div>Symbol: {symbol}</div>
      <div>Your Prediction: ${userPrediction.toFixed(2)}</div>
      {actualPrice && <div>Actual Price: ${actualPrice.toFixed(2)}</div>}
      {actualPrice && (
        <div>
          Score: {Math.abs(userPrediction - actualPrice) < 5 ? "Great!" : "Try again!"}
        </div>
      )}
    </div>
  </Card>
);