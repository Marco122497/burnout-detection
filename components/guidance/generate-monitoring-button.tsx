"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SparklesIcon, Loader2 } from "lucide-react";

import {
  generateDepartmentMonitoring,
  type GuidanceActionState,
} from "@/app/actions/guidance";
import { fillDatePresets } from "@/lib/guidance/fill-week-dates";
import { useActionToast } from "@/hooks/use-action-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const initialState: GuidanceActionState = {};

const RISK_MIX_PRESETS = [
  { id: "even", label: "Even", low: 34, moderate: 33, high: 33 },
  { id: "low-heavy", label: "50/30/20", low: 50, moderate: 30, high: 20 },
  { id: "balanced-mid", label: "40/40/20", low: 40, moderate: 40, high: 20 },
  { id: "high-heavy", label: "20/30/50", low: 20, moderate: 30, high: 50 },
] as const;

type RiskMix = { low: number; moderate: number; high: number };

function projectedRiskCounts(total: number, mix: RiskMix) {
  if (total <= 0) return { low: 0, moderate: 0, high: 0 };
  const sum = mix.low + mix.moderate + mix.high || 1;
  const shares = [
    { key: "low" as const, share: (total * mix.low) / sum },
    { key: "moderate" as const, share: (total * mix.moderate) / sum },
    { key: "high" as const, share: (total * mix.high) / sum },
  ];
  const floors = shares.map((item) => ({
    key: item.key,
    count: Math.floor(item.share),
    frac: item.share - Math.floor(item.share),
  }));
  let remaining = total - floors.reduce((n, item) => n + item.count, 0);
  for (const item of [...floors].sort((a, b) => b.frac - a.frac)) {
    if (remaining <= 0) break;
    item.count += 1;
    remaining -= 1;
  }
  return {
    low: floors.find((item) => item.key === "low")?.count ?? 0,
    moderate: floors.find((item) => item.key === "moderate")?.count ?? 0,
    high: floors.find((item) => item.key === "high")?.count ?? 0,
  };
}

export type GenerateMonitoringStudent = {
  id: string;
  full_name: string;
  student_number: string | null;
  week_number: number | null;
  submittedWeek1?: boolean;
  submittedWeek2?: boolean;
};

function hasBothWeeks(student: GenerateMonitoringStudent) {
  return student.submittedWeek1 === true && student.submittedWeek2 === true;
}

function formatWeekList(weeks: number[]) {
  const names = weeks.map((week) => `Week ${week}`);
  if (names.length === 0) return "weeks";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function GenerateMonitoringButton({
  departmentId,
  departmentLabel,
  currentWeek,
  monitoringOpen,
  students,
}: {
  departmentId: string;
  departmentLabel: string;
  currentWeek: number;
  monitoringOpen: boolean;
  students: GenerateMonitoringStudent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [skipExisting, setSkipExisting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [riskMix, setRiskMix] = useState<RiskMix>({
    low: 34,
    moderate: 33,
    high: 33,
  });
  const [personalFeelings, setPersonalFeelings] = useState(false);
  const datePresets = fillDatePresets();
  const [fillWeek1, setFillWeek1] = useState(true);
  const [fillWeek2, setFillWeek2] = useState(true);
  const [fillWeek3, setFillWeek3] = useState(true);
  const [week1From, setWeek1From] = useState(datePresets[0].range.from);
  const [week1To, setWeek1To] = useState(datePresets[0].range.to);
  const [week2From, setWeek2From] = useState(datePresets[2].range.from);
  const [week2To, setWeek2To] = useState(datePresets[2].range.to);
  const [week3From, setWeek3From] = useState(datePresets[3].range.from);
  const [week3To, setWeek3To] = useState(datePresets[3].range.to);

  const [generateState, setGenerateState] =
    useState<GuidanceActionState>(initialState);
  const [generatePending, setGeneratePending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  useActionToast(generateState);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set(students.map((student) => student.id)));
      setRiskMix({ low: 34, moderate: 33, high: 33 });
      setPersonalFeelings(false);
      setFillWeek1(true);
      setFillWeek2(true);
      setFillWeek3(true);
      const presets = fillDatePresets();
      setWeek1From(presets[0].range.from);
      setWeek1To(presets[0].range.to);
      setWeek2From(presets[2].range.from);
      setWeek2To(presets[2].range.to);
      setWeek3From(presets[3].range.from);
      setWeek3To(presets[3].range.to);
    }
  }, [open, students]);

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedIds.has(student.id)),
    [students, selectedIds]
  );

  const submittedCount = useMemo(
    () =>
      students.filter((student) => student.week_number === currentWeek).length,
    [students, currentWeek]
  );
  const week1Count = useMemo(
    () => students.filter((student) => student.submittedWeek1).length,
    [students]
  );
  const week2Count = useMemo(
    () => students.filter((student) => student.submittedWeek2).length,
    [students]
  );
  const bothWeeksCount = useMemo(
    () => students.filter((student) => hasBothWeeks(student)).length,
    [students]
  );

  const selectedFillWeeks = [
    fillWeek1
      ? { week: 1, from: week1From, to: week1To }
      : null,
    fillWeek2
      ? { week: 2, from: week2From, to: week2To }
      : null,
    fillWeek3
      ? { week: 3, from: week3From, to: week3To }
      : null,
  ].filter((week): week is { week: number; from: string; to: string } =>
    week != null
  );
  const datesValid =
    selectedFillWeeks.length > 0 &&
    selectedFillWeeks.every((week) => week.from && week.to && week.from <= week.to);

  const riskMixTotal = riskMix.low + riskMix.moderate + riskMix.high;
  const riskMixValid = riskMixTotal === 100;
  const projectedRisk = useMemo(
    () => projectedRiskCounts(selectedStudents.length, riskMix),
    [selectedStudents.length, riskMix]
  );

  function setRiskPercent(key: keyof RiskMix, raw: string) {
    const next = Number(raw);
    setRiskMix((current) => ({
      ...current,
      [key]: Number.isFinite(next) ? Math.max(0, Math.min(100, Math.round(next))) : 0,
    }));
  }

  const allSelected =
    students.length > 0 &&
    students.every((student) => selectedIds.has(student.id));
  const someSelected = students.some((student) => selectedIds.has(student.id));

  function toggleStudent(studentId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(studentId);
      } else {
        next.delete(studentId);
      }
      return next;
    });
  }

  function toggleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(new Set(students.map((student) => student.id)));
      return;
    }
    setSelectedIds(new Set());
  }

  function selectWeek1Submitted() {
    setSelectedIds(
      new Set(
        students
          .filter((student) => student.submittedWeek1)
          .map((student) => student.id)
      )
    );
  }

  function selectWeek2Submitted() {
    setSelectedIds(
      new Set(
        students
          .filter((student) => student.submittedWeek2)
          .map((student) => student.id)
      )
    );
  }

  function selectBothWeeks() {
    setSelectedIds(
      new Set(
        students
          .filter((student) => hasBothWeeks(student))
          .map((student) => student.id)
      )
    );
  }

  function selectPercent(percent: number) {
    if (students.length === 0) {
      setSelectedIds(new Set());
      return;
    }
    const count = Math.max(1, Math.round((students.length * percent) / 100));
    const shuffled = [...students];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setSelectedIds(new Set(shuffled.slice(0, count).map((student) => student.id)));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setClientError(null);
    setGenerateState(initialState);
    setGeneratePending(true);
    try {
      const result = await generateDepartmentMonitoring(initialState, formData);
      setGenerateState(result ?? {});
      if (result?.success) {
        setOpen(false);
        router.refresh();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to fetch";
      setClientError(
        message === "Failed to fetch" || message === "fetch failed"
          ? "Auto-fill timed out or lost connection. Try a smaller group (40–60%) or fewer students."
          : message
      );
    } finally {
      setGeneratePending(false);
    }
  }

  if (!departmentId) return null;

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        disabled={generatePending || students.length === 0}
      >
        {generatePending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Filling…
          </>
        ) : (
          <>
            <SparklesIcon className="size-4" />
            Fill Week 1, 2, or 3
          </>
        )}
      </Button>

      <AlertDialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!generatePending) setOpen(nextOpen);
        }}
      >
        <AlertDialogContent className="max-h-[90vh] gap-3 overflow-y-auto data-[size=default]:max-w-2xl data-[size=default]:sm:max-w-2xl">
          <form onSubmit={handleSubmit}>
            <AlertDialogHeader>
              <AlertDialogMedia>
                <SparklesIcon />
              </AlertDialogMedia>
              <AlertDialogTitle>Auto-fill weekly monitoring</AlertDialogTitle>
              <AlertDialogDescription>
                Randomly answer the weekly monitoring questionnaire for selected
                students in{" "}
                <span className="font-medium text-foreground">
                  {departmentLabel}
                </span>{" "}
                . Choose Week 1, Week 2, Week 3, or a combination, and set the submission dates
                for each week
                {monitoringOpen ? ` (Week ${currentWeek} is open now)` : ""}.
                Set how many percent should land in Low, Moderate, and High.
                Each student gets a random submission time inside that week’s
                dates. A week runs Monday to Sunday. This uses the same PSS,
                Workload, Study Time, and Sleep questions students fill in, then
                saves scores, MFBI, and predictions.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <input type="hidden" name="department_id" value={departmentId} />
            <input
              type="hidden"
              name="skip_existing"
              value={skipExisting ? "1" : "0"}
            />
            <input
              type="hidden"
              name="student_ids"
              value={JSON.stringify(selectedStudents.map((student) => student.id))}
              readOnly
            />
            <input type="hidden" name="risk_low_percent" value={riskMix.low} />
            <input
              type="hidden"
              name="risk_moderate_percent"
              value={riskMix.moderate}
            />
            <input type="hidden" name="risk_high_percent" value={riskMix.high} />
            <input
              type="hidden"
              name="answer_style"
              value={personalFeelings ? "personal" : "random"}
            />
            <input type="hidden" name="fill_week_1" value={fillWeek1 ? "1" : "0"} />
            <input type="hidden" name="fill_week_2" value={fillWeek2 ? "1" : "0"} />
            <input type="hidden" name="fill_week_3" value={fillWeek3 ? "1" : "0"} />
            <input type="hidden" name="date_from_1" value={week1From} />
            <input type="hidden" name="date_to_1" value={week1To} />
            <input type="hidden" name="date_from_2" value={week2From} />
            <input type="hidden" name="date_to_2" value={week2To} />
            <input type="hidden" name="date_from_3" value={week3From} />
            <input type="hidden" name="date_to_3" value={week3To} />

            {students.length > 0 ? (
              <div className="mt-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Select students — {selectedStudents.length} of{" "}
                    {students.length} chosen
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {submittedCount} submitted
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      disabled={generatePending || week1Count === 0}
                      onClick={selectWeek1Submitted}
                    >
                      Week 1 submitted ({week1Count})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      disabled={generatePending || week2Count === 0}
                      onClick={selectWeek2Submitted}
                    >
                      Week 2 submitted ({week2Count})
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2.5 text-xs"
                      disabled={generatePending || bothWeeksCount === 0}
                      onClick={selectBothWeeks}
                    >
                      Week 1 and 2 submitted ({bothWeeksCount})
                    </Button>
                    {([10, 20, 30, 40, 50, 60] as const).map((percent) => (
                      <Button
                        key={percent}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        disabled={generatePending}
                        onClick={() => selectPercent(percent)}
                      >
                        {percent}%
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="max-h-56 overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <input
                            type="checkbox"
                            aria-label="Select all students"
                            checked={allSelected}
                            ref={(element) => {
                              if (element) {
                                element.indeterminate =
                                  someSelected && !allSelected;
                              }
                            }}
                            disabled={generatePending || students.length === 0}
                            onChange={(event) =>
                              toggleSelectAll(event.target.checked)
                            }
                          />
                        </TableHead>
                        <TableHead>Student no.</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => {
                        const submittedThisWeek =
                          student.week_number === currentWeek;
                        const bothWeeks = hasBothWeeks(student);
                        const status = bothWeeks
                          ? submittedThisWeek && currentWeek > 2
                            ? `Week 1 and 2 · Week ${currentWeek} submitted`
                            : "Week 1 and 2 submitted"
                          : submittedThisWeek
                            ? `Week ${currentWeek} submitted`
                            : student.submittedWeek1
                              ? "Submitted Week 1"
                              : student.submittedWeek2
                                ? "Submitted Week 2"
                                : "No Week 1 or 2";
                        return (
                          <TableRow key={student.id}>
                            <TableCell>
                              <input
                                type="checkbox"
                                aria-label={`Select ${student.full_name}`}
                                checked={selectedIds.has(student.id)}
                                disabled={generatePending}
                                onChange={(event) =>
                                  toggleStudent(
                                    student.id,
                                    event.target.checked
                                  )
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {student.student_number || "—"}
                            </TableCell>
                            <TableCell className="max-w-[14rem] truncate">
                              {student.full_name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {status}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}

            <div className="mt-4 space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">Risk mix (%)</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    type="button"
                    variant={personalFeelings ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2.5 text-xs"
                    disabled={generatePending}
                    onClick={() => setPersonalFeelings((current) => !current)}
                  >
                    Personal feelings
                  </Button>
                  {RISK_MIX_PRESETS.map((preset) => {
                    const active =
                      riskMix.low === preset.low &&
                      riskMix.moderate === preset.moderate &&
                      riskMix.high === preset.high;
                    return (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={active ? "default" : "outline"}
                        size="sm"
                        className="h-7 px-2.5 text-xs"
                        disabled={generatePending}
                        onClick={() =>
                          setRiskMix({
                            low: preset.low,
                            moderate: preset.moderate,
                            high: preset.high,
                          })
                        }
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { key: "low", label: "Low", tone: "text-emerald-700 dark:text-emerald-400" },
                    {
                      key: "moderate",
                      label: "Moderate",
                      tone: "text-amber-800 dark:text-amber-400",
                    },
                    { key: "high", label: "High", tone: "text-orange-800 dark:text-orange-400" },
                  ] as const
                ).map((item) => (
                  <label key={item.key} className="space-y-1 text-xs">
                    <span className={`font-medium ${item.tone}`}>{item.label}</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={riskMix[item.key]}
                      disabled={generatePending}
                      onChange={(event) =>
                        setRiskPercent(item.key, event.target.value)
                      }
                      className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    />
                  </label>
                ))}
              </div>
              <p
                className={
                  riskMixValid
                    ? "text-xs text-muted-foreground"
                    : "text-xs text-destructive"
                }
              >
                {riskMixValid
                  ? `Total 100% · projected ${projectedRisk.low} Low · ${projectedRisk.moderate} Moderate · ${projectedRisk.high} High`
                  : `Percentages must total 100 (currently ${riskMixTotal}).`}
              </p>
              {personalFeelings ? (
                <p className="text-xs text-muted-foreground">
                  Personal feelings keeps each student on one mood. Stress,
                  workload, study, and sleep move together, with only a small
                  difference between questions. The mix above still decides how
                  many students feel Low, Moderate, or High.
                </p>
              ) : null}
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-sm font-medium">Weeks to fill</p>
              {(
                [
                  {
                    week: 1,
                    checked: fillWeek1,
                    setChecked: setFillWeek1,
                    from: week1From,
                    to: week1To,
                    setFrom: setWeek1From,
                    setTo: setWeek1To,
                  },
                  {
                    week: 2,
                    checked: fillWeek2,
                    setChecked: setFillWeek2,
                    from: week2From,
                    to: week2To,
                    setFrom: setWeek2From,
                    setTo: setWeek2To,
                  },
                  {
                    week: 3,
                    checked: fillWeek3,
                    setChecked: setFillWeek3,
                    from: week3From,
                    to: week3To,
                    setFrom: setWeek3From,
                    setTo: setWeek3To,
                  },
                ] as const
              ).map((item) => (
                <div key={item.week} className="space-y-2 rounded-lg border p-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      disabled={generatePending}
                      onChange={(event) => item.setChecked(event.target.checked)}
                    />
                    Week {item.week}
                    {currentWeek === item.week && monitoringOpen
                      ? " (open now)"
                      : ""}
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {datePresets.map((preset) => {
                      const active =
                        item.from === preset.range.from &&
                        item.to === preset.range.to;
                      return (
                        <Button
                          key={preset.id}
                          type="button"
                          variant={active ? "default" : "outline"}
                          size="sm"
                          className="h-7 px-2.5 text-xs"
                          disabled={generatePending || !item.checked}
                          onClick={() => {
                            item.setFrom(preset.range.from);
                            item.setTo(preset.range.to);
                          }}
                        >
                          {preset.label}
                        </Button>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="space-y-1 text-xs">
                      <span className="font-medium">From</span>
                      <input
                        type="date"
                        value={item.from}
                        disabled={generatePending || !item.checked}
                        onChange={(event) => item.setFrom(event.target.value)}
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </label>
                    <label className="space-y-1 text-xs">
                      <span className="font-medium">To</span>
                      <input
                        type="date"
                        value={item.to}
                        disabled={generatePending || !item.checked}
                        onChange={(event) => item.setTo(event.target.value)}
                        className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      />
                    </label>
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Each week uses its own dates as the random submission times.
                Next week (Mon–Sat) is the coming Monday through Saturday.
              </p>
            </div>

            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipExisting}
                disabled={generatePending}
                onChange={(event) => setSkipExisting(event.target.checked)}
              />
              Skip students who already submitted the selected week
            </label>

            {clientError || generateState.error ? (
              <p className="mt-3 text-sm text-destructive">
                {clientError || generateState.error}
              </p>
            ) : null}
            {generateState.success ? (
              <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
                {generateState.success}
              </p>
            ) : null}

            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel type="button" disabled={generatePending}>
                Cancel
              </AlertDialogCancel>
              <Button
                type="submit"
                disabled={
                  generatePending ||
                  students.length === 0 ||
                  selectedStudents.length === 0 ||
                  !riskMixValid ||
                  !datesValid
                }
              >
                {generatePending ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Filling…
                  </>
                ) : (
                  `Fill ${formatWeekList(selectedFillWeeks.map((week) => week.week))} · ${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"}`
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
