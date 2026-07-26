import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { BurnoutLevel } from "@/lib/student/mfbi";
import { getTipsForLevel } from "@/lib/student/tips";

export function RecommendationsView({
  burnoutLevel,
  guidance,
}: {
  burnoutLevel: BurnoutLevel | null;
  guidance: {
    title: string;
    description: string;
    burnout_level: string;
    recommended_action?: string | null;
  } | null;
}) {
  const tips = getTipsForLevel(burnoutLevel);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Guidance recommendation</CardTitle>
          <CardDescription>
            Matched to your current burnout risk
            {burnoutLevel ? ` (${burnoutLevel})` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {guidance ? (
            <div className="space-y-2">
              <p className="font-medium">{guidance.title}</p>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {guidance.description}
              </p>
              {guidance.recommended_action ? (
                <p className="text-sm text-muted-foreground">
                  Recommended action: {guidance.recommended_action}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete weekly monitoring to unlock personalized guidance.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {tips.map((tip) => (
          <Card key={tip.category}>
            <CardHeader>
              <CardDescription>{tip.category}</CardDescription>
              <CardTitle className="text-lg">{tip.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                {tip.tips.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
