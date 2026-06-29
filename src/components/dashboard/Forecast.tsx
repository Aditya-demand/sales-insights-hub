import { useMemo } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Gauge, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compactNum, currency, type SaleRecord } from "@/lib/sales-data";
import { forecastRevenue } from "@/lib/forecasting";

function MetricBadge({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-primary"
      : tone === "warn"
        ? "text-destructive"
        : "text-foreground";
  return (
    <Card>
      <CardContent className="flex items-start gap-3 p-4">
        <div className="rounded-lg bg-muted p-2 text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ForecastTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number | null; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium">{label}</p>
      {payload
        .filter((p) => p.value != null && p.name !== "Confidence range")
        .map((p) => (
          <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
            <span>{p.name}:</span>
            <span className="font-medium text-foreground">{currency(p.value as number)}</span>
          </p>
        ))}
    </div>
  );
}

export function ForecastPanel({ records }: { records: SaleRecord[] }) {
  const result = useMemo(() => forecastRevenue(records, 6), [records]);
  const { accuracy, points, trendSlope, seasonality, history, horizon } = result;

  const forecastTotal = points
    .filter((p) => p.actual == null && p.forecast != null)
    .reduce((s, p) => s + (p.forecast ?? 0), 0);

  const lastActual = [...points].reverse().find((p) => p.actual != null)?.actual ?? 0;
  const nextForecast = points.find((p) => p.actual == null && p.forecast != null)?.forecast ?? 0;
  const momChange = lastActual ? ((nextForecast - lastActual) / lastActual) * 100 : 0;

  if (history < 3) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
          <Activity className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Not enough history to forecast</p>
          <p className="text-sm text-muted-foreground">
            At least 3 months of data are needed. Widen your filters or import more records.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Build a band series (lower + height) for the area visualisation.
  const chartData = points.map((p) => ({
    label: p.label,
    actual: p.actual,
    fitted: p.fitted,
    forecast: p.forecast,
    bandBase: p.lower,
    bandSpan: p.lower != null && p.upper != null ? p.upper - p.lower : null,
  }));

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricBadge
          label={`Next ${horizon} months (projected)`}
          value={currency(forecastTotal)}
          hint="Sum of forecasted revenue"
          icon={Target}
          tone="good"
        />
        <MetricBadge
          label="Next month vs last"
          value={`${momChange >= 0 ? "+" : ""}${momChange.toFixed(1)}%`}
          hint={currency(nextForecast)}
          icon={momChange >= 0 ? TrendingUp : TrendingDown}
          tone={momChange >= 0 ? "good" : "warn"}
        />
        <MetricBadge
          label="Trend"
          value={`${trendSlope >= 0 ? "+" : ""}${currency(Math.round(trendSlope))}/mo`}
          hint={seasonality ? "Trend + seasonality model" : "Linear trend model"}
          icon={Gauge}
        />
        <MetricBadge
          label="Forecast accuracy (R²)"
          value={accuracy ? `${(accuracy.r2 * 100).toFixed(0)}%` : "—"}
          hint={accuracy ? `Backtested on ${accuracy.testSize} months` : "Need more data"}
          icon={Activity}
          tone={accuracy && accuracy.r2 >= 0.5 ? "good" : "default"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Revenue forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={360}>
            <ComposedChart data={chartData} margin={{ left: -4, right: 8, top: 8 }}>
              <defs>
                <linearGradient id="bandFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={compactNum}
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                width={48}
              />
              <Tooltip content={<ForecastTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {/* confidence band: invisible base + visible span stacked on top */}
              <Area
                stackId="band"
                dataKey="bandBase"
                stroke="none"
                fill="transparent"
                legendType="none"
                isAnimationActive={false}
              />
              <Area
                stackId="band"
                dataKey="bandSpan"
                name="Confidence range"
                stroke="none"
                fill="url(#bandFill)"
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="fitted"
                name="Model fit"
                stroke="var(--chart-2)"
                strokeWidth={1.5}
                strokeDasharray="2 3"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="forecast"
                name="Forecast"
                stroke="var(--chart-3)"
                strokeWidth={2.5}
                strokeDasharray="6 4"
                dot={{ r: 2.5 }}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Model evaluation</CardTitle>
        </CardHeader>
        <CardContent>
          {accuracy ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Metric label="MAPE" value={`${accuracy.mape.toFixed(1)}%`} desc="Mean abs. % error" />
                <Metric label="MAE" value={currency(Math.round(accuracy.mae))} desc="Mean abs. error" />
                <Metric label="RMSE" value={currency(Math.round(accuracy.rmse))} desc="Root mean sq. error" />
                <Metric
                  label="R²"
                  value={accuracy.r2.toFixed(2)}
                  desc="Variance explained"
                />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                The model was trained on the earlier {history - accuracy.testSize} months and tested
                against the most recent {accuracy.testSize} months it had never seen. Lower MAPE/MAE/RMSE
                and a higher R² mean more reliable predictions.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not enough history for an out-of-sample backtest. Import more months of data to evaluate
              accuracy.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value, desc }: { label: string; value: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
