import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw } from "lucide-react";
import { DEFAULT_FILTERS, type Filters } from "@/lib/sales-analytics";

interface FilterBarProps {
  filters: Filters;
  onChange: (f: Filters) => void;
  facets: { categories: string[]; regions: string[]; reps: string[] };
}

const RANGES: { value: Filters["range"]; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "180", label: "Last 6 months" },
  { value: "90", label: "Last 90 days" },
  { value: "30", label: "Last 30 days" },
];

function FacetSelect({
  value,
  onValueChange,
  placeholder,
  options,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
  options: string[];
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[150px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function FilterBar({ filters, onChange, facets }: FilterBarProps) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });
  const active =
    filters.category !== "all" ||
    filters.region !== "all" ||
    filters.rep !== "all" ||
    filters.range !== "all";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.range} onValueChange={(v) => set({ range: v as Filters["range"] })}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {RANGES.map((r) => (
            <SelectItem key={r.value} value={r.value}>
              {r.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FacetSelect
        value={filters.category}
        onValueChange={(v) => set({ category: v })}
        placeholder="Categories"
        options={facets.categories}
      />
      <FacetSelect
        value={filters.region}
        onValueChange={(v) => set({ region: v })}
        placeholder="Regions"
        options={facets.regions}
      />
      <FacetSelect
        value={filters.rep}
        onValueChange={(v) => set({ rep: v })}
        placeholder="Reps"
        options={facets.reps}
      />
      {active ? (
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_FILTERS)}>
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          Reset
          <Badge variant="secondary" className="ml-1">
            on
          </Badge>
        </Button>
      ) : null}
    </div>
  );
}
