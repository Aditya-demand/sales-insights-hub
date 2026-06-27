import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, Database, AlertCircle, CheckCircle2 } from "lucide-react";
import { mapRows, generateSampleData, REQUIRED_FIELDS, type SaleRecord } from "@/lib/sales-data";
import { cn } from "@/lib/utils";

interface ImportDialogProps {
  onImport: (data: SaleRecord[], source: string) => void;
}

export function ImportDialog({ onImport }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const finish = (rows: Record<string, unknown>[], name: string) => {
    const { data, errors } = mapRows(rows);
    setErrors(errors);
    if (data.length) {
      onImport(data, name);
      setTimeout(() => setOpen(false), errors.length ? 1200 : 400);
    }
  };

  const handleFile = (file: File) => {
    setErrors([]);
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "txt") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => finish(res.data as Record<string, unknown>[], file.name),
        error: (e) => setErrors([e.message]),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: "array", cellDates: true });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        finish(XLSX.utils.sheet_to_json(sheet), file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setErrors([`Unsupported file type ".${ext}". Use CSV or Excel.`]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Import data
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import sales data</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file, or load a connected sample dataset.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            drag ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          )}
        >
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          <p className="text-sm font-medium">Drop your file here or click to browse</p>
          <p className="text-xs text-muted-foreground">.csv, .xlsx, .xls</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>

        <Button
          variant="secondary"
          onClick={() => {
            onImport(generateSampleData(), "Sample database");
            setOpen(false);
          }}
        >
          <Database className="mr-2 h-4 w-4" />
          Load sample database
        </Button>

        {errors.length > 0 && (
          <div className="space-y-1 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4" /> Import notes
            </div>
            {errors.map((e, i) => (
              <p key={i} className="text-xs">
                {e}
              </p>
            ))}
          </div>
        )}

        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
          <div className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Expected columns
          </div>
          {REQUIRED_FIELDS.join(", ")} — column names are auto-detected (e.g. "amount" → revenue).
        </div>
      </DialogContent>
    </Dialog>
  );
}
