import { PageTemplate } from "../../../components/page-template";

export default function DocumentsPage() {
  return (
    <PageTemplate
      eyebrow="Public records"
      title="Documents"
      intro="The documents page will surface public committee publications first, while protected draft material stays separate inside the participant workspace."
      highlights={[
        "Publicly released committee documents",
        "Categorized downloads and metadata",
        "Clear separation from draft review materials"
      ]}
      nextSteps={[
        "Connect to the documents API module",
        "Add search, filtering, and file metadata",
        "Introduce visibility rules for public versus restricted assets"
      ]}
    />
  );
}
