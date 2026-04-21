import { PageTemplate } from "../../../components/page-template";

export default function MeetingsPage() {
  return (
    <PageTemplate
      eyebrow="Committee calendar"
      title="Meetings"
      intro="Meeting scheduling, agendas, minutes, and attendance details will live here, with public visibility controlled independently from private committee material."
      highlights={[
        "Upcoming meeting schedule",
        "Agendas and published minutes",
        "Future participant-only meeting resources"
      ]}
      nextSteps={[
        "Connect to the meetings API module",
        "Add calendar-friendly metadata and status",
        "Separate public meeting pages from restricted attachments"
      ]}
    />
  );
}
