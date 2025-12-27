"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertTriangle,
  Loader2,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { type Account } from "@/lib/validators/account"
import { DATE_FORMATS, type ParsedCsvTransaction } from "@/lib/validators/csv-import"
import { cn } from "@/lib/utils"

interface CsvImportFormProps {
  accounts: Account[]
  onSuccess: () => void
  onCancel: () => void
}

type Step = "upload" | "mapping" | "preview" | "importing" | "done"

export function CsvImportForm({ accounts, onSuccess, onCancel }: CsvImportFormProps) {
  const [step, setStep] = useState<Step>("upload")
  const [fileName, setFileName] = useState<string>("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [previewData, setPreviewData] = useState<ParsedCsvTransaction[]>([])
  const [importResult, setImportResult] = useState<{
    imported: number
    skipped: number
    duplicates: number
    errors: string[]
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Mapping state
  const [accountId, setAccountId] = useState<string>("")
  const [dateColumn, setDateColumn] = useState<string>("")
  const [amountColumn, setAmountColumn] = useState<string>("")
  const [descriptionColumn, setDescriptionColumn] = useState<string>("")
  const [splitAmounts, setSplitAmounts] = useState(false)
  const [debitColumn, setDebitColumn] = useState<string>("")
  const [creditColumn, setCreditColumn] = useState<string>("")
  const [dateFormat, setDateFormat] = useState<string>("YYYY-MM-DD")
  const [hasHeader, setHasHeader] = useState(true)

  const parseCSV = useCallback((text: string): { headers: string[]; rows: Record<string, string>[] } => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim())
    if (lines.length === 0) return { headers: [], rows: [] }

    // Simple CSV parsing (handles basic cases)
    const parseLine = (line: string): string[] => {
      const result: string[] = []
      let current = ""
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === "," && !inQuotes) {
          result.push(current.trim())
          current = ""
        } else {
          current += char
        }
      }
      result.push(current.trim())
      return result
    }

    const headerLine = parseLine(lines[0])
    const headers = headerLine.map((h, i) => h || `Column ${i + 1}`)

    const dataRows = lines.slice(1).map((line) => {
      const values = parseLine(line)
      const row: Record<string, string> = {}
      headers.forEach((header, i) => {
        row[header] = values[i] || ""
      })
      return row
    })

    return { headers, rows: dataRows }
  }, [])

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      if (!file.name.endsWith(".csv")) {
        toast.error("Please upload a CSV file")
        return
      }

      setFileName(file.name)

      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        const { headers, rows } = parseCSV(text)

        if (headers.length === 0) {
          toast.error("Could not parse CSV file")
          return
        }

        setHeaders(headers)
        setRows(rows)

        // Auto-detect columns
        const lowerHeaders = headers.map((h) => h.toLowerCase())
        const dateIdx = lowerHeaders.findIndex((h) =>
          h.includes("date") || h.includes("transaction date")
        )
        const amountIdx = lowerHeaders.findIndex((h) =>
          h.includes("amount") || h === "sum"
        )
        const descIdx = lowerHeaders.findIndex((h) =>
          h.includes("description") || h.includes("desc") || h.includes("memo") || h.includes("name")
        )
        const debitIdx = lowerHeaders.findIndex((h) =>
          h.includes("debit") || h.includes("withdrawal")
        )
        const creditIdx = lowerHeaders.findIndex((h) =>
          h.includes("credit") || h.includes("deposit")
        )

        if (dateIdx >= 0) setDateColumn(headers[dateIdx])
        if (amountIdx >= 0) setAmountColumn(headers[amountIdx])
        if (descIdx >= 0) setDescriptionColumn(headers[descIdx])
        if (debitIdx >= 0 && creditIdx >= 0) {
          setSplitAmounts(true)
          setDebitColumn(headers[debitIdx])
          setCreditColumn(headers[creditIdx])
        }

        setStep("mapping")
      }
      reader.readAsText(file)
    },
    [parseCSV]
  )

  const handlePreview = async () => {
    if (!accountId || !dateColumn || (!amountColumn && !splitAmounts)) {
      toast.error("Please complete the required mappings")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapping: {
            account_id: accountId,
            date_column: dateColumn,
            amount_column: amountColumn,
            description_column: descriptionColumn,
            split_amounts: splitAmounts,
            debit_column: debitColumn,
            credit_column: creditColumn,
            date_format: dateFormat,
            has_header: hasHeader,
          },
          rows: hasHeader ? rows : rows,
          preview_only: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to preview import")
      }

      const data = await response.json()
      setPreviewData(data.transactions || [])
      setStep("preview")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Preview failed")
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async () => {
    setIsLoading(true)
    setStep("importing")

    try {
      const response = await fetch("/api/transactions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapping: {
            account_id: accountId,
            date_column: dateColumn,
            amount_column: amountColumn,
            description_column: descriptionColumn,
            split_amounts: splitAmounts,
            debit_column: debitColumn,
            credit_column: creditColumn,
            date_format: dateFormat,
            has_header: hasHeader,
          },
          rows: hasHeader ? rows : rows,
          preview_only: false,
        }),
      })

      if (!response.ok) {
        throw new Error("Import failed")
      }

      const result = await response.json()
      setImportResult(result)
      setStep("done")

      if (result.imported > 0) {
        toast.success(`Imported ${result.imported} transactions`)
        onSuccess()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed")
      setStep("preview")
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Step: Upload */}
      {step === "upload" && (
        <div className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <Label
              htmlFor="csv-file"
              className="cursor-pointer text-primary hover:underline"
            >
              Click to upload CSV file
            </Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
            <p className="text-sm text-muted-foreground mt-2">
              Supports common bank export formats (RBC, TD, etc.)
            </p>
          </div>
        </div>
      )}

      {/* Step: Mapping */}
      {step === "mapping" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{fileName}</p>
              <p className="text-sm text-muted-foreground">
                {rows.length} rows detected
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStep("upload")}>
              Change file
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Import to Account *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} ({a.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Column *</Label>
              <Select value={dateColumn} onValueChange={setDateColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select value={dateFormat} onValueChange={setDateFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Description Column</Label>
              <Select
                value={descriptionColumn}
                onValueChange={setDescriptionColumn}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="split-amounts"
              checked={splitAmounts}
              onCheckedChange={(checked) => setSplitAmounts(!!checked)}
            />
            <Label htmlFor="split-amounts" className="font-normal">
              Separate debit/credit columns (common in bank exports)
            </Label>
          </div>

          {splitAmounts ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Debit/Withdrawal Column *</Label>
                <Select value={debitColumn} onValueChange={setDebitColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Credit/Deposit Column *</Label>
                <Select value={creditColumn} onValueChange={setCreditColumn}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select column" />
                  </SelectTrigger>
                  <SelectContent>
                    {headers.map((h) => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Amount Column *</Label>
              <Select value={amountColumn} onValueChange={setAmountColumn}>
                <SelectTrigger>
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>
                      {h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handlePreview} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Preview Import
            </Button>
          </div>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing first {previewData.length} transactions
            </p>
            <div className="flex gap-2">
              {previewData.filter((t) => t.is_duplicate).length > 0 && (
                <Badge variant="outline">
                  {previewData.filter((t) => t.is_duplicate).length} duplicates
                </Badge>
              )}
              {previewData.filter((t) => t.error).length > 0 && (
                <Badge variant="destructive">
                  {previewData.filter((t) => t.error).length} errors
                </Badge>
              )}
            </div>
          </div>

          <ScrollArea className="h-64">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {previewData.map((t, i) => (
                  <TableRow key={i} className={cn(t.error && "bg-destructive/10", t.is_duplicate && "bg-yellow-50 dark:bg-yellow-950/30")}>
                    <TableCell>
                      {t.error ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : t.is_duplicate ? (
                        <Badge variant="outline" className="text-xs">Duplicate</Badge>
                      ) : (
                        <Check className="h-4 w-4 text-green-500" />
                      )}
                    </TableCell>
                    <TableCell>{t.date || "-"}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.description || "-"}</TableCell>
                    <TableCell className={cn("text-right", t.amount < 0 ? "text-red-600" : "text-green-600")}>
                      {t.amount ? formatCurrency(t.amount) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setStep("mapping")}>
              Back
            </Button>
            <Button onClick={handleImport} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import {previewData.filter((t) => !t.error && !t.is_duplicate).length} Transactions
            </Button>
          </div>
        </div>
      )}

      {/* Step: Importing */}
      {step === "importing" && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Importing transactions...</p>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && importResult && (
        <div className="space-y-4">
          <div className="text-center py-4">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold">Import Complete</h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
              <p className="text-2xl font-bold text-green-600">{importResult.imported}</p>
              <p className="text-sm text-muted-foreground">Imported</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30">
              <p className="text-2xl font-bold text-yellow-600">{importResult.duplicates}</p>
              <p className="text-sm text-muted-foreground">Duplicates Skipped</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
              <p className="text-2xl font-bold text-red-600">{importResult.errors.length}</p>
              <p className="text-sm text-muted-foreground">Errors</p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onCancel}>Done</Button>
          </div>
        </div>
      )}
    </div>
  )
}
