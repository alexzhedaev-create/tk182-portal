import { StatusPage } from "../components/status-page";

interface ErrorPageProps {
  statusCode?: number;
}

export default function LegacyErrorPage({ statusCode }: ErrorPageProps) {
  const code = statusCode ?? 500;

  return (
    <StatusPage
      code={String(code)}
      title={code === 404 ? "Страница не найдена" : "Временная ошибка"}
      description={
        code === 404
          ? "Запрошенная страница не найдена в портале ТК 182."
          : "Во время открытия страницы произошла ошибка. Попробуйте обновить страницу."
      }
    />
  );
}
