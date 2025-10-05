import React from "react";
import { Card } from "./ui/Card";

interface SummaryCardProps {
  symbol: string;
  probUp: number;
  var95?: number;
  es95?: number;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  symbol,
  probUp,
  var95,
  es95,
}) => (
  <Card title="Key Metrics" collapsible>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <span className="font-semibold">Symbol:</span> {symbol}
      </div>
      <div>
        <span className="font-semibold">Prob Up:</span>{" "}
        {(probUp * 100).toFixed(1)}%
      </div>

      {var95 !== undefined && var95 !== null && (
        <div>
          <span className="font-semibold">VaR 95%:</span> ${var95.toFixed(2)}
        </div>
      )}

      {es95 !== undefined && es95 !== null && (
        <div>
          <span className="font-semibold">ES 95%:</span> ${es95.toFixed(2)}
        </div>
      )}
    </div>
  </Card>
);
