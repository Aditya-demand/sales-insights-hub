import { useMemo } from "react";
import type { SaleRecord } from "./sales-data";

export interface Filters {
  category: string;
  region: string;
  rep: string;
  range: "all" | "30" | "90" | "180";
}

export const DEFAULT_FILTERS: Filters = {
  category: "all",
  region: "all",
  rep: "all",
  range: "all",
};

function unique(records: SaleRecord[], key: keyof SaleRecord) {
  return Array.from(new Set(records.map((r) => String(r[key])))).sort();
}

export function useFacets(records: SaleRecord[]) {
  return useMemo(
    () => ({
      categories: unique(records, "category"),
      regions: unique(records, "region"),
      reps: unique(records, "rep"),
    }),
    [records],
  );
}

export function applyFilters(records: SaleRecord[], f: Filters): SaleRecord[] {
  let cutoff = "";
  if (f.range !== "all" && records.length) {
    const latest = records.reduce((m, r) => (r.date > m ? r.date : m), records[0].date);
    const d = new Date(latest);
    d.setDate(d.getDate() - Number(f.range));
    cutoff = d.toISOString().slice(0, 10);
  }
  return records.filter(
    (r) =>
      (f.category === "all" || r.category === f.category) &&
      (f.region === "all" || r.region === f.region) &&
      (f.rep === "all" || r.rep === f.rep) &&
      (!cutoff || r.date >= cutoff),
  );
}

export interface Kpis {
  revenue: number;
  units: number;
  orders: number;
  aov: number;
  revenueDelta: number | null;
}

export function computeKpis(records: SaleRecord[]): Kpis {
  const revenue = records.reduce((s, r) => s + r.revenue, 0);
  const units = records.reduce((s, r) => s + r.units, 0);
  const orders = records.length;

  let revenueDelta: number | null = null;
  if (records.length) {
    const dates = records.map((r) => r.date).sort();
    const latest = new Date(dates[dates.length - 1]);
    const mid = new Date(latest);
    mid.setDate(mid.getDate() - 30);
    const prevStart = new Date(latest);
    prevStart.setDate(prevStart.getDate() - 60);
    const midStr = mid.toISOString().slice(0, 10);
    const prevStr = prevStart.toISOString().slice(0, 10);
    const recent = records.filter((r) => r.date >= midStr).reduce((s, r) => s + r.revenue, 0);
    const prev = records
      .filter((r) => r.date >= prevStr && r.date < midStr)
      .reduce((s, r) => s + r.revenue, 0);
    if (prev > 0) revenueDelta = ((recent - prev) / prev) * 100;
  }

  return {
    revenue,
    units,
    orders,
    aov: orders ? revenue / orders : 0,
    revenueDelta,
  };
}

export function revenueByMonth(records: SaleRecord[]) {
  const map = new Map<string, { revenue: number; units: number }>();
  for (const r of records) {
    const key = r.date.slice(0, 7);
    const cur = map.get(key) ?? { revenue: 0, units: 0 };
    cur.revenue += r.revenue;
    cur.units += r.units;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      revenue: Math.round(v.revenue),
      units: v.units,
    }));
}

export function topBy(
  records: SaleRecord[],
  key: keyof SaleRecord,
  limit = 5,
): { name: string; revenue: number; units: number }[] {
  const map = new Map<string, { revenue: number; units: number }>();
  for (const r of records) {
    const k = String(r[key]);
    const cur = map.get(k) ?? { revenue: 0, units: 0 };
    cur.revenue += r.revenue;
    cur.units += r.units;
    map.set(k, cur);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({ name, revenue: Math.round(v.revenue), units: v.units }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export function shareByCategory(records: SaleRecord[]) {
  return topBy(records, "category", 99);
}
