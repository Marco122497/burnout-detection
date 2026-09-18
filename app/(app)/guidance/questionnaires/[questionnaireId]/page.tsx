import { redirect } from "next/navigation";

export const metadata = {
  title: "Questionnaires",
};

export default async function GuidanceQuestionnaireDetailPage({
  params,
}: {
  params: Promise<{ questionnaireId: string }>;
}) {
  const { questionnaireId } = await params;
  redirect(`/guidance/questionnaires?tab=${questionnaireId}`);
}
