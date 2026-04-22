"use client";

import { StatusPage } from "../components/status-page";

export default function ErrorPage() {
  return (
    <StatusPage
      code="500"
      title="Ошибка сервера"
      description="На сервере произошла ошибка. Попробуйте обновить страницу немного позже."
    />
  );
}
