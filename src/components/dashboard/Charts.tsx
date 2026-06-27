import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { compactNum, currency, type SaleRecord } from "@/lib/sales-data";
import { revenueByMonth, shareByCategory, topBy } from "@/lib/sales-analytics";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function TooltipBox({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string }[];
  label?: string;
  formatter: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      {label ? <p className="mb-1 font-medium">{label}</p> : null}
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: p.color ?? "var(--chart-1)" }}
          />
          <span className="capitalize">{p.name}:</span>
          <span className="font-medium text-foreground">{formatter(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

export function RevenueTrend({ records }: { records: SaleRecord[] }) {
  const data = revenueByMonth(records);
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Revenue trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={data} margin={{ left: -8, right: 8, top: 4 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={compactNum} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={44} />
            <Tooltip content={<TooltipBox formatter={currency} />} />
            <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CategoryShare({ records }: { records: SaleRecord[] }) {
  const data = shareByCategory(records);
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by category</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              dataKey="revenue"
              nameKey="name"
              innerRadius={58}
              outerRadius={92}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<TooltipBox formatter={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-2 space-y-1.5">
          {data.slice(0, 5).map((d, i) => (
            <div key={d.name} className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {d.name}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {total ? ((d.revenue / total) * 100).toFixed(0) : 0}%
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function TopProducts({ records }: { records: SaleRecord[] }) {
  const data = topBy(records, "product", 7);
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader>
        <CardTitle>Top performing products</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tickFormatter={compactNum} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<TooltipBox formatter={currency} />} />
            <Bar dataKey="revenue" fill="var(--chart-1)" radius={[0, 6, 6, 0]} barSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function RegionBreakdown({ records }: { records: SaleRecord[] }) {
  const data = topBy(records, "region", 99);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Revenue by region</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ left: -8, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={compactNum} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} width={44} />
            <Tooltip cursor={{ fill: "var(--muted)", opacity: 0.4 }} content={<TooltipBox formatter={currency} />} />
            <Bar dataKey="revenue" fill="var(--chart-2)" radius={[6, 6, 0, 0]} barSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
