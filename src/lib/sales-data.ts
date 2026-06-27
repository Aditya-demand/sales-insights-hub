export interface SaleRecord {
  date: string; // ISO yyyy-mm-dd
  product: string;
  category: string;
  region: string;
  rep: string;
  units: number;
  revenue: number;
}

export const REQUIRED_FIELDS: (keyof SaleRecord)[] = [
  "date",
  "product",
  "category",
  "region",
  "rep",
  "units",
  "revenue",
];

const PRODUCTS = [
  { name: "Aurora Headset", category: "Audio", price: 189 },
  { name: "Pulse Earbuds", category: "Audio", price: 79 },
  { name: "Nimbus Laptop", category: "Computers", price: 1299 },
  { name: "Vertex Monitor", category: "Computers", price: 349 },
  { name: "Glide Mouse", category: "Accessories", price: 45 },
  { name: "Tactile Keyboard", category: "Accessories", price: 129 },
  { name: "Volt Power Bank", category: "Accessories", price: 59 },
  { name: "Orbit Smartwatch", category: "Wearables", price: 249 },
  { name: "Flux Fitness Band", category: "Wearables", price: 99 },
  { name: "Lumen Tablet", category: "Computers", price: 599 },
];
const REGIONS = ["North", "South", "East", "West", "Central"];
const REPS = ["Ava Chen", "Liam Patel", "Maya Reyes", "Noah Kim", "Sofia Ortiz", "Ethan Wood"];

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function generateSampleData(): SaleRecord[] {
  const rand = seeded(42);
  const records: SaleRecord[] = [];
  const today = new Date();
  const start = new Date(today);
  start.setMonth(start.getMonth() - 11);
  start.setDate(1);

  const days = Math.round((today.getTime() - start.getTime()) / 86400000);
  for (let i = 0; i < 1400; i++) {
    const dayOffset = Math.floor(rand() * days);
    const d = new Date(start);
    d.setDate(d.getDate() + dayOffset);
    const p = PRODUCTS[Math.floor(rand() * PRODUCTS.length)];
    const units = 1 + Math.floor(rand() * 6);
    const seasonal = 1 + 0.35 * Math.sin((dayOffset / days) * Math.PI * 2);
    const revenue = Math.round(p.price * units * seasonal * (0.9 + rand() * 0.2));
    records.push({
      date: d.toISOString().slice(0, 10),
      product: p.name,
      category: p.category,
      region: REGIONS[Math.floor(rand() * REGIONS.length)],
      rep: REPS[Math.floor(rand() * REPS.length)],
      units,
      revenue,
    });
  }
  return records.sort((a, b) => a.date.localeCompare(b.date));
}

const FIELD_ALIASES: Record<keyof SaleRecord, string[]> = {
  date: ["date", "order date", "day", "timestamp", "sale date"],
  product: ["product", "item", "product name", "sku"],
  category: ["category", "type", "department", "segment"],
  region: ["region", "area", "territory", "market", "country"],
  rep: ["rep", "salesperson", "sales rep", "seller", "agent", "employee"],
  units: ["units", "quantity", "qty", "count", "volume"],
  revenue: ["revenue", "sales", "amount", "total", "value", "price"],
};

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[_-]+/g, " ");
}

export function mapRows(rows: Record<string, unknown>[]): {
  data: SaleRecord[];
  errors: string[];
} {
  const errors: string[] = [];
  if (!rows.length) return { data: [], errors: ["No rows found in file."] };

  const headers = Object.keys(rows[0]);
  const map: Partial<Record<keyof SaleRecord, string>> = {};
  for (const field of REQUIRED_FIELDS) {
    const match = headers.find((h) => FIELD_ALIASES[field].includes(normalize(h)));
    if (match) map[field] = match;
  }

  const missing = REQUIRED_FIELDS.filter((f) => !map[f]);
  if (missing.length) {
    errors.push(`Could not find column(s) for: ${missing.join(", ")}.`);
    return { data: [], errors };
  }

  const data: SaleRecord[] = [];
  rows.forEach((row, idx) => {
    const raw = (f: keyof SaleRecord) => row[map[f]!];
    const dateVal = raw("date");
    let date = "";
    if (dateVal instanceof Date) date = dateVal.toISOString().slice(0, 10);
    else {
      const parsed = new Date(String(dateVal));
      if (!isNaN(parsed.getTime())) date = parsed.toISOString().slice(0, 10);
    }
    const units = Number(String(raw("units")).replace(/[^0-9.-]/g, ""));
    const revenue = Number(String(raw("revenue")).replace(/[^0-9.-]/g, ""));
    if (!date || isNaN(units) || isNaN(revenue)) {
      if (idx < 5) errors.push(`Row ${idx + 1}: skipped (invalid date/number).`);
      return;
    }
    data.push({
      date,
      product: String(raw("product") ?? "Unknown"),
      category: String(raw("category") ?? "Uncategorized"),
      region: String(raw("region") ?? "Unknown"),
      rep: String(raw("rep") ?? "Unknown"),
      units,
      revenue,
    });
  });

  if (!data.length) errors.push("No valid rows could be imported.");
  return { data: data.sort((a, b) => a.date.localeCompare(b.date)), errors };
}

export const currency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: n >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: n >= 1000 ? 0 : 2,
  }).format(n);

export const compactNum = (n: number) =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
