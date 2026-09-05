import type {
  GenderRiskStats,
  GenderVariableStats,
} from "@/lib/reports/gender-risk";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function BurnoutByGenderCard({
  byGender,
  mostProneGender,
  mostProneGenderNote,
  byGenderVariable = [],
}: {
  byGender: GenderRiskStats[];
  mostProneGender?: "Male" | "Female" | null;
  mostProneGenderNote?: string | null;
  byGenderVariable?: GenderVariableStats[];
}) {
  const hasVariableData = byGenderVariable.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Burnout & Factors by Gender</CardTitle>
        <CardDescription>
          Compare Male and Female High counts for burnout, stress, workload,
          study time, and sleep.
        </CardDescription>
        {mostProneGenderNote ? (
          <p className="mt-1.5 text-xs font-medium text-foreground">
            {mostProneGender
              ? `Most High burnout: ${mostProneGender}. `
              : null}
            {mostProneGenderNote}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-6">
        {byGender.length === 0 && !hasVariableData ? (
          <p className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No gender data yet. Ask students to complete gender on login.
          </p>
        ) : null}

        {hasVariableData ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Variable</th>
                  <th className="pb-2 pr-3 font-medium">Most High count</th>
                  <th className="pb-2 pr-3 text-right font-medium">Male High</th>
                  <th className="pb-2 pr-3 text-right font-medium">
                    Female High
                  </th>
                  <th className="pb-2 text-right font-medium">
                    Leading High
                  </th>
                </tr>
              </thead>
              <tbody>
                {byGenderVariable.map((variable) => {
                  const maleHigh =
                    variable.byGender.find((item) => item.label === "Male")
                      ?.high ?? 0;
                  const femaleHigh =
                    variable.byGender.find((item) => item.label === "Female")
                      ?.high ?? 0;
                  return (
                    <tr
                      key={variable.key}
                      className="border-b last:border-0"
                    >
                      <td className="py-2.5 pr-3 font-medium">
                        {variable.label}
                      </td>
                      <td className="py-2.5 pr-3">
                        {variable.mostHighCountGender ?? "Tied / —"}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {maleHigh}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {femaleHigh}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {variable.mostHighCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {byGender.length > 0 ? (
          <div className="overflow-x-auto">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Burnout (MFBI) detail
            </p>
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-3 font-medium">Gender</th>
                  <th className="pb-2 pr-3 text-right font-medium">Students</th>
                  <th className="pb-2 pr-3 text-right font-medium">Low</th>
                  <th className="pb-2 pr-3 text-right font-medium">Moderate</th>
                  <th className="pb-2 pr-3 text-right font-medium">High</th>
                  <th className="pb-2 pr-3 text-right font-medium">High rate</th>
                  <th className="pb-2 text-right font-medium">Avg MFBI</th>
                </tr>
              </thead>
              <tbody>
                {byGender.map((item) => {
                  const emphasized =
                    mostProneGender != null && item.label === mostProneGender;
                  return (
                    <tr
                      key={item.label}
                      className={
                        emphasized
                          ? "border-b bg-destructive/5 font-medium last:border-0"
                          : "border-b last:border-0"
                      }
                    >
                      <td className="py-2.5 pr-3">{item.label}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {item.total}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {item.low}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {item.moderate}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {item.high}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {item.classified > 0 ? `${item.highRate}%` : "—"}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        {item.averageMfbi != null
                          ? item.averageMfbi.toFixed(2)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
