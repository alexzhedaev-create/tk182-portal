import { StatusPage } from "../components/status-page";

export default function RuntimeProbePage() {
  return (
    <StatusPage
      code="MVP"
      title="Служебная страница runtime"
      description="Служебный маршрут Pages Router используется только для стабильной production-сборки локального MVP."
    />
  );
}
