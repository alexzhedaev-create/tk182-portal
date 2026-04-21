import { PageTemplate } from "../../../components/page-template";

export default function NewsPage() {
  return (
    <PageTemplate
      eyebrow="Updates"
      title="News"
      intro="The news area is prepared for announcements, publication releases, meeting notices, and review-cycle updates that belong on the public website."
      highlights={[
        "Committee announcements",
        "Publishing and meeting updates",
        "Structured news entries from the API"
      ]}
      nextSteps={[
        "Connect to the news API module",
        "Add article detail pages and archives",
        "Define editorial workflow for public announcements"
      ]}
    />
  );
}
