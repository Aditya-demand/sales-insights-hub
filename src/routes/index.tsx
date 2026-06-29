import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, DollarSign, Package, Receipt, ShoppingCart, TrendingUp } from "lucide-react";
import { generateSampleData, currency, compactNum, type SaleRecord } from "@/lib/sales-data";
import {
  applyFilters,
  computeKpis,
  DEFAULT_FILTERS,
  useFacets,
  type Filters,
} from "@/lib/sales-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { ImportDialog } from "@/components/dashboard/ImportDialog";
import { SalesTable } from "@/components/dashboard/SalesTable";
import { ForecastPanel } from "@/components/dashboard/Forecast";
import {
  CategoryShare,
  RegionBreakdown,
  RevenueTrend,
  TopProducts,
} from "@/components/dashboard/Charts";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sales & Revenue Analysis Dashboard" },
      {
        name: "description",
        content:
          "Import sales data and track KPIs, revenue trends, and top products with interactive charts and filters.",
      },
      { property: "og:title", content: "Sales & Revenue Analysis Dashboard" },
      {
        property: "og:description",
        content:
          "Interactive dashboard for sales KPIs, revenue trends, and product performance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [records, setRecords] = useState<SaleRecord[]>(() => generateSampleData());
  const [source, setSource] = useState("Sample database");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const facets = useFacets(records);
  const filtered = useMemo(() => applyFilters(records, filters), [records, filters]);
  const kpis = useMemo(() => computeKpis(filtered), [filtered]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-primary/15 p-2 text-primary">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">Sales &amp; Revenue Analysis</h1>
              <p className="text-xs text-muted-foreground">Source: {source}</p>
            </div>
          </div>
          <ImportDialog
            onImport={(data, name) => {
              setRecords(data);
              setSource(name);
              setFilters(DEFAULT_FILTERS);
            }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Filters &amp; slicers</h2>
          <FilterBar filters={filters} onChange={setFilters} facets={facets} />
        </div>

        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard
            label="Total revenue"
            value={currency(kpis.revenue)}
            icon={DollarSign}
            delta={kpis.revenueDelta}
            sub="vs prev 30d"
          />
          <KpiCard label="Units sold" value={compactNum(kpis.units)} icon={Package} />
          <KpiCard label="Orders" value={compactNum(kpis.orders)} icon={ShoppingCart} />
          <KpiCard label="Avg order value" value={currency(kpis.aov)} icon={Receipt} />
        </section>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-20 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">No data matches your filters</p>
            <p className="text-sm text-muted-foreground">
              Adjust the slicers above or import a different dataset.
            </p>
          </div>
        ) : (
          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="forecast">Forecast</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-5">
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <RevenueTrend records={filtered} />
                <CategoryShare records={filtered} />
              </section>
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <TopProducts records={filtered} />
                <RegionBreakdown records={filtered} />
              </section>
              <SalesTable records={filtered} />
            </TabsContent>
            <TabsContent value="forecast">
              <ForecastPanel records={filtered} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
