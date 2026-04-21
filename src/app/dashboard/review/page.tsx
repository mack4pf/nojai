import { requireActiveSubscription } from "@/lib/session";
import { ReviewSubmissionForm } from "@/components/dashboard/review-submission-form";

export default async function DashboardReviewPage() {
  await requireActiveSubscription();
  return <ReviewSubmissionForm />;
}