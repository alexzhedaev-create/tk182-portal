import Link from "next/link";

import { getCommitteeStructure, getPublicStandards } from "../../lib/api";

export const dynamic = "force-dynamic";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

export default async function HomePage() {
  const [committee, standards] = await Promise.all([
    getCommitteeStructure(),
    getPublicStandards()
  ]);

  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Официальный портал</div>
          <h1 className="hero-title">ТК 182: структура комитета и рабочий контур согласования.</h1>
          <p className="hero-copy">
            Портал объединяет публичную информацию о ТК 182, кабинет участника и
            кабинет секретариата. На публичной части уже отражены руководство,
            секретариат, подкомитеты и действующие проекты стандартов.
          </p>
        </div>

        <div className="pill-row">
          <span className="pill">Подкомитетов: {committee.subcommittees.length}</span>
          <span className="pill">Организаций в структуре: {committee.organizations.length}</span>
          <span className="pill">Проектов стандартов: {standards.length}</span>
          <Link className="pill" href={`${apiBaseUrl}/health`}>
            Состояние API
          </Link>
        </div>

        <div className="hero-grid">
          <article>
            <h2>Руководство ТК 182</h2>
            <p>
              Сопредседатели: {committee.leadership.map((item) => item.person.fullName).join(", ")}.
            </p>
          </article>
          <article>
            <h2>Секретариат</h2>
            <p>
              Секретариат ведёт{" "}
              {committee.secretariatHostOrganization?.name ?? "базовая организация комитета"}.
            </p>
          </article>
          <article>
            <h2>Подкомитеты</h2>
            <p>
              Действуют тематические ПК 1–ПК 7 по материалам, оборудованию,
              управлению жизненным циклом, испытаниям и медицине.
            </p>
          </article>
        </div>
      </section>

      <section className="status-grid">
        <article>
          <div className="eyebrow">Публичный сайт</div>
          <h2>Реальная структура ТК 182</h2>
          <p>
            Публичные страницы уже показывают руководство, секретариат, базовые
            организации и распределение ответственности по подкомитетам.
          </p>
        </article>
        <article>
          <div className="eyebrow">Workflow</div>
          <h2>Проекты стандартов связаны с подкомитетами</h2>
          <p>
            Каждый проект стандарта в рабочем контуре и на публичной витрине
            может быть привязан к ответственному подкомитету ТК 182.
          </p>
        </article>
        <article>
          <div className="eyebrow">Локальный MVP</div>
          <h2>Без облачных сервисов</h2>
          <p>
            Портал остаётся локальным MVP: Next.js, NestJS, PostgreSQL,
            cookie-сессии и файловое хранилище в локальной инфраструктуре.
          </p>
        </article>
      </section>

      <section className="route-grid">
        <article>
          <h2>Публичные разделы</h2>
          <p>
            Здесь размещены открытые сведения о структуре ТК 182, организациях и
            текущих проектах стандартизации.
          </p>
          <div className="pill-row">
            <Link className="pill" href="/about">
              Руководство и подкомитеты
            </Link>
            <Link className="pill" href="/contacts">
              Секретариат
            </Link>
            <Link className="pill" href="/standards">
              Проекты стандартов
            </Link>
            <Link className="pill" href="/organizations">
              Организации
            </Link>
          </div>
        </article>
        <article>
          <h2>Рабочий контур</h2>
          <p>
            Участники и секретариат могут перейти в защищённые кабинеты для
            согласования проектов стандартов и управления циклами.
          </p>
          <div className="pill-row">
            <Link className="pill" href="/login">
              Страница входа
            </Link>
            <Link className="pill" href="/participant">
              Кабинет участника
            </Link>
            <Link className="pill" href="/secretariat">
              Кабинет секретариата
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
