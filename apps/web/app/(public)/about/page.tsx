import { PageTemplate } from "../../../components/page-template";

export default function AboutPage() {
  return (
    <PageTemplate
      eyebrow="Committee profile"
      title="About TK182"
      intro="This section is ready for the committee charter, mission, membership model, governance structure, and publication context."
      highlights={[
        "Committee mandate and scope",
        "Leadership and governance structure",
        "Participation model and eligibility"
      ]}
      nextSteps={[
        "Add managed public page content from the API",
        "Introduce committee timeline and milestones",
        "Link public documents and participation guidance"
      ]}
    />
  );
}
