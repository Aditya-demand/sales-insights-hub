import type { SaleRecord } from "./sales-data";

export interface SeriesPoint {
  /** yyyy-mm */
  key: string;
  /** display label e.g. "Jan 24" */
  label: string;
  value: number;
}

export interface ForecastPoint {
  label: string;
  actual: number | null;
  fitted: number | null;
  forecast: number | null;
  lower: number | null;
  upper: number | null;
}

export interface Accuracy {
  mae: number;
  rmse: number;
  mape: number;
  r2: number;
  /** number of points held out for the backtest */
  testSize: number;
}

export interface ForecastResult {
  points: ForecastPoint[];
  accuracy: Accuracy | null;
  trendSlope: number;
  seasonality: boolean;
  history: number;
  horizon: number;
}

function monthLabel(key: string) {
  return new Date(key + "-01").toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

/** Aggregate records into a continuous monthly series (gaps filled with 0). */
export function monthlySeries(records: SaleRecord[]): SeriesPoint[] {
  if (!records.length) return [];
  const map = new Map<string, number>();
  for (const r of records) {
    const k = r.date.slice(0, 7);
    map.set(k, (map.get(k) ?? 0) + r.revenue);
  }
  const keys = Array.from(map.keys()).sort();
  const first = keys[0];
  const last = keys[keys.length - 1];
  const out: SeriesPoint[] = [];
  const cur = new Date(first + "-01");
  const end = new Date(last + "-01");
  while (cur <= end) {
    const k = cur.toISOString().slice(0, 7);
    out.push({ key: k, label: monthLabel(k), value: Math.round(map.get(k) ?? 0) });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

/** Ordinary least squares on (index, value) pairs. */
function linearFit(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };
  let sx = 0,
    sy = 0,
    sxx = 0,
    sxy = 0;
  for (let i = 0; i < n; i++) {
    sx += i;
    sy += values[i];
    sxx += i * i;
    sxy += i * values[i];
  }
  const denom = n * sxx - sx * sx;
  const slope = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

/**
 * Multiplicative seasonal indices by calendar month, derived from the ratio
 * of each observation to its detrended (linear) baseline.
 */
function seasonalIndices(series: SeriesPoint[], slope: number, intercept: number) {
  const buckets: Record<number, number[]> = {};
  series.forEach((p, i) => {
    const base = intercept + slope * i;
    if (base <= 0) return;
    const m = new Date(p.key + "-01").getMonth();
    (buckets[m] ??= []).push(p.value / base);
  });
  const idx: Record<number, number> = {};
  let sum = 0;
  let count = 0;
  for (let m = 0; m < 12; m++) {
    const arr = buckets[m];
    idx[m] = arr && arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 1;
    sum += idx[m];
    count++;
  }
  // normalise so indices average to 1
  const mean = sum / count;
  for (let m = 0; m < 12; m++) idx[m] = mean ? idx[m] / mean : 1;
  return idx;
}

function predict(
  i: number,
  monthIndex: number,
  slope: number,
  intercept: number,
  seasonal: Record<number, number> | null,
) {
  const base = intercept + slope * i;
  const s = seasonal ? seasonal[monthIndex] : 1;
  return Math.max(0, base * s);
}

function evaluate(actual: number[], predicted: number[]): Accuracy {
  const n = actual.length;
  let absErr = 0,
    sqErr = 0,
    pctErr = 0,
    pctCount = 0;
  const mean = actual.reduce((s, v) => s + v, 0) / n;
  let ssRes = 0,
    ssTot = 0;
  for (let i = 0; i < n; i++) {
    const e = actual[i] - predicted[i];
    absErr += Math.abs(e);
    sqErr += e * e;
    ssRes += e * e;
    ssTot += (actual[i] - mean) ** 2;
    if (actual[i] !== 0) {
      pctErr += Math.abs(e / actual[i]);
      pctCount++;
    }
  }
  return {
    mae: absErr / n,
    rmse: Math.sqrt(sqErr / n),
    mape: pctCount ? (pctErr / pctCount) * 100 : 0,
    r2: ssTot === 0 ? 0 : 1 - ssRes / ssTot,
    testSize: n,
  };
}

/**
 * Builds a trend + seasonal forecast from a monthly revenue series and
 * back-tests it with a holdout split to report out-of-sample accuracy.
 */
export function forecastRevenue(records: SaleRecord[], horizon = 6): ForecastResult {
  const series = monthlySeries(records);
  const n = series.length;
  const useSeasonal = n >= 12;

  if (n < 3) {
    return {
      points: series.map((p) => ({
        label: p.label,
        actual: p.value,
        fitted: null,
        forecast: null,
        lower: null,
        upper: null,
      })),
      accuracy: null,
      trendSlope: 0,
      seasonality: false,
      history: n,
      horizon,
    };
  }

  const values = series.map((p) => p.value);
  const months = series.map((p) => new Date(p.key + "-01").getMonth());

  // ---- Backtest: train on all but the last `testSize`, predict the holdout.
  const testSize = Math.min(Math.max(2, Math.round(n * 0.2)), Math.max(2, n - 3));
  let accuracy: Accuracy | null = null;
  if (n - testSize >= 3) {
    const trainVals = values.slice(0, n - testSize);
    const { slope, intercept } = linearFit(trainVals);
    const seasonal = useSeasonal
      ? seasonalIndices(series.slice(0, n - testSize), slope, intercept)
      : null;
    const predicted: number[] = [];
    for (let i = n - testSize; i < n; i++) {
      predicted.push(predict(i, months[i], slope, intercept, seasonal));
    }
    accuracy = evaluate(values.slice(n - testSize), predicted);
  }

  // ---- Final model: fit on full history.
  const { slope, intercept } = linearFit(values);
  const seasonal = useSeasonal ? seasonalIndices(series, slope, intercept) : null;

  // Residual std-dev for confidence bands.
  let sqRes = 0;
  const fitted: number[] = [];
  for (let i = 0; i < n; i++) {
    const f = predict(i, months[i], slope, intercept, seasonal);
    fitted.push(f);
    sqRes += (values[i] - f) ** 2;
  }
  const sigma = Math.sqrt(sqRes / n);

  const points: ForecastPoint[] = series.map((p, i) => ({
    label: p.label,
    actual: p.value,
    fitted: Math.round(fitted[i]),
    forecast: null,
    lower: null,
    upper: null,
  }));

  // bridge actual -> forecast so the lines connect visually
  const last = series[n - 1];
  points[n - 1].forecast = Math.round(fitted[n - 1]);

  const cur = new Date(last.key + "-01");
  for (let h = 1; h <= horizon; h++) {
    cur.setMonth(cur.getMonth() + 1);
    const k = cur.toISOString().slice(0, 7);
    const i = n - 1 + h;
    const f = predict(i, cur.getMonth(), slope, intercept, seasonal);
    const band = 1.96 * sigma;
    points.push({
      label: monthLabel(k),
      actual: null,
      fitted: null,
      forecast: Math.round(f),
      lower: Math.round(Math.max(0, f - band)),
      upper: Math.round(f + band),
    });
  }

  return {
    points,
    accuracy,
    trendSlope: slope,
    seasonality: useSeasonal,
    history: n,
    horizon,
  };
}
