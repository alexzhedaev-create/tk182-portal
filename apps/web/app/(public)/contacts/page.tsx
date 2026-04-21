import { PageTemplate } from "../../../components/page-template";

export default function ContactsPage() {
  return (
    <PageTemplate
      eyebrow="Directory"
      title="Contacts"
      intro="This page is reserved for official contact channels, secretariat details, committee participation enquiries, and submission guidance."
      highlights={[
        "Secretariat and general enquiries",
        "Participation guidance contacts",
        "Official communication channels"
      ]}
      nextSteps={[
        "Add editable committee contact data",
        "Surface office hours and response expectations",
        "Prepare structured forms for internal handling later"
      ]}
    />
  );
}
