"use client";

import { useMemo, useState } from "react";
import { Search, Download, ArrowUpDown } from "lucide-react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatDate, formatDuration, percentOf } from "@/lib/utils";
import type { ExamResult, Mock } from "@/lib/types";

type SortKey = "marks" | "percentage" | "date" | "speed";

export function ResultsTable({ results, mocks }: { results: ExamResult[]; mocks: Mock[] }) {
  const [mockFilter, setMockFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const mockById = useMemo(() => new Map(mocks.map((m) => [m.id, m])), [mocks]);
  const batches = useMemo(
    () => Array.from(new Set(results.map((r) => r.batch))).sort(),
    [results],
  );

  const filtered = useMemo(() => {
    let rows = results;
    if (mockFilter !== "all") rows = rows.filter((r) => r.mock_id === mockFilter);
    if (batchFilter !== "all") rows = rows.filter((r) => r.batch === batchFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) => r.student_name.toLowerCase().includes(q) || r.acca_id.toLowerCase().includes(q),
      );
    }

    const sorted = [...rows].sort((a, b) => {
      let diff = 0;
      switch (sortKey) {
        case "marks":
          diff = a.marks_obtained - b.marks_obtained;
          break;
        case "percentage":
          diff = a.percentage - b.percentage;
          break;
        case "date":
          diff = new Date(a.submission_time).getTime() - new Date(b.submission_time).getTime();
          break;
        case "speed":
          diff = b.time_taken_seconds - a.time_taken_seconds; // faster = higher when desc
          break;
      }
      return sortDir === "asc" ? diff : -diff;
    });
    return sorted;
  }, [results, mockFilter, batchFilter, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function exportCsv() {
    const header = [
      "Student Name",
      "RISE/ACCA ID",
      "Batch",
      "Mock",
      "Marks Obtained",
      "Total Marks",
      "Percentage",
      "Correct",
      "Incorrect",
      "Unattempted",
      "Time Taken",
      "Submitted",
    ];
    const rows = filtered.map((r) => [
      r.student_name,
      r.acca_id,
      r.batch,
      mockById.get(r.mock_id)?.mock_name ?? r.mock_id,
      r.marks_obtained,
      r.total_marks,
      r.percentage,
      r.correct_count,
      r.incorrect_count,
      r.unattempted_count,
      formatDuration(r.time_taken_seconds),
      formatDate(r.submission_time),
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `results-${mockFilter === "all" ? "all-mocks" : mockById.get(mockFilter)?.mock_name}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or ACCA ID…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={mockFilter} onChange={(e) => setMockFilter(e.target.value)} className="w-48">
          <option value="all">All Mocks</option>
          {mocks.map((m) => (
            <option key={m.id} value={m.id}>
              {m.mock_name}
            </option>
          ))}
        </Select>
        <Select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} className="w-44">
          <option value="all">All Batches</option>
          {batches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
        <Button type="button" variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-5 py-3 font-medium">Student</th>
                <th className="px-5 py-3 font-medium">ACCA ID</th>
                <th className="px-5 py-3 font-medium">Batch</th>
                <th className="px-5 py-3 font-medium">Mock</th>
                <SortableHeader label="Marks" active={sortKey === "marks"} dir={sortDir} onClick={() => toggleSort("marks")} />
                <SortableHeader
                  label="Percentage"
                  active={sortKey === "percentage"}
                  dir={sortDir}
                  onClick={() => toggleSort("percentage")}
                />
                <th className="px-5 py-3 font-medium">Status</th>
                <SortableHeader label="Time Taken" active={sortKey === "speed"} dir={sortDir} onClick={() => toggleSort("speed")} />
                <SortableHeader label="Submitted" active={sortKey === "date"} dir={sortDir} onClick={() => toggleSort("date")} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                    No results match your filters.
                  </td>
                </tr>
              )}
              {filtered.map((r) => {
                const mock = mockById.get(r.mock_id);
                const pass = mock ? percentOf(r.marks_obtained, r.total_marks) >= mock.pass_percentage : true;
                return (
                  <tr key={`${r.mock_id}:${r.acca_id}`} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-medium text-foreground">{r.student_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{r.acca_id}</td>
                    <td className="px-5 py-3">{r.batch}</td>
                    <td className="px-5 py-3">{mock?.mock_name ?? "—"}</td>
                    <td className="px-5 py-3">
                      {r.marks_obtained}/{r.total_marks}
                    </td>
                    <td className="px-5 py-3">{r.percentage}%</td>
                    <td className="px-5 py-3">
                      <Badge variant={pass ? "success" : "danger"}>{pass ? "Pass" : "Fail"}</Badge>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDuration(r.time_taken_seconds)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatDate(r.submission_time)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-5 py-3 font-medium">
      <button type="button" onClick={onClick} className="flex items-center gap-1 hover:text-foreground">
        {label}
        <ArrowUpDown className={`h-3.5 w-3.5 ${active ? "text-brand" : "text-muted-foreground"}`} />
        {active && <span className="sr-only">{dir}</span>}
      </button>
    </th>
  );
}
