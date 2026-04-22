import { StatusPage } from "../components/status-page";

export default function NotFoundPage() {
  return (
    <StatusPage
      code="404"
      title="Страница не найдена"
      description="Запрошенная страница не найдена в портале ТК 182."
    />
  );
}
