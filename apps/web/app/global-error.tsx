"use client";

import { StatusPage } from "../components/status-page";

export default function GlobalErrorPage() {
  return (
    <html lang="ru">
      <body>
        <StatusPage
          code="500"
          title="Ошибка приложения"
          description="Не удалось открыть страницу. Попробуйте повторить действие немного позже."
        />
      </body>
    </html>
  );
}
