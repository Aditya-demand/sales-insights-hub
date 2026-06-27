import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, Search } from "lucide-react";
import { currency, type SaleRecord } from "@/lib/sales-data";

type SortKey = keyof SaleRecord;

export function SalesTable({ records }: { records: SaleRecord[] }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 });

  const rows = useMemo(() => {
    const q = query.toLowerCase();
    const filtered = q
      ? records.filter((r) =>
          [r.product, r.category, r.region, r.rep].some((v) => v.toLowerCase().includes(q)),
        )
      : records;
    return [...filtered]
      .sort((a, b) => {
        const av = a[sort.key];
        const bv = b[sort.key];
        if (typeof av === "number" && typeof bv === "number") return (av - bv) * sort.dir;
        return String(av).localeCompare(String(bv)) * sort.dir;
      })
      .slice(0, 100);
  }, [records, query, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: -1 }));

  const cols: { key: SortKey; label: string; align?: string }[] = [
    { key: "date", label: "Date" },
    { key: "product", label: "Product" },
    { key: "category", label: "Category" },
    { key: "region", label: "Region" },
    { key: "rep", label: "Rep" },
    { key: "units", label: "Units", align: "text-right" },
    { key: "revenue", label: "Revenue", align: "text-right" },
  ];

  return (
    <Card className="col-span-full">
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>Transactions</CardTitle>
        <div className="relative w-56 max-w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {cols.map((c) => (
                  <TableHead key={c.key} className={c.align}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-7 gap-1 px-2 text-xs"
                      onClick={() => toggleSort(c.key)}
                    >
                      {c.label}
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    </Button>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell className="text-muted-foreground">{r.date}</TableCell>
                  <TableCell className="font-medium">{r.product}</TableCell>
                  <TableCell>{r.category}</TableCell>
                  <TableCell>{r.region}</TableCell>
                  <TableCell>{r.rep}</TableCell>
                  <TableCell className="text-right tabular-nums">{r.units}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {currency(r.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Showing {rows.length} of {records.length} transactions
        </p>
      </CardContent>
    </Card>
  );
}
