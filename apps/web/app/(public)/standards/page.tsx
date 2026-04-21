import { PageTemplate } from "../../../components/page-template";

export default function StandardsPage() {
  return (
    <PageTemplate
      eyebrow="Standards program"
      title="Standards"
      intro="This section will publish the committee's standard catalogue, current stage markers, and public summaries for each work item."
      highlights={[
        "Standard catalogue and identifiers",
        "Lifecycle status for each work item",
        "Future links into review-cycle context"
      ]}
      nextSteps={[
        "Connect standards listing data from the API",
        "Add standard detail pages",
        "Link review-cycle metadata for authorized users later"
      ]}
    />
  );
}
