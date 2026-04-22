import Link from "next/link";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function HomePage() {
  return (
    <div className="page-frame">
      <section className="hero-card">
        <div>
          <div className="eyebrow">Локальный MVP</div>
          <h1 className="hero-title">Рабочий портал ТК 182 для согласования проектов стандартов.</h1>
          <p className="hero-copy">
            Портал разделяет публичный сайт, кабинет участника и кабинет
            секретариата. Локальная инфраструктура, база данных и авторизация
            уже работают, а первый цикл согласования доступен в демо-режиме.
          </p>
        </div>

        <div className="pill-row">
          <Link className="pill" href="/">
            Публичный сайт
          </Link>
          <Link className="pill" href="/participant">
            Кабинет участника
          </Link>
          <Link className="pill" href="/secretariat">
            Кабинет секретариата
          </Link>
          <Link className="pill" href={`${apiBaseUrl}/health`}>
            Состояние API
          </Link>
        </div>

        <div className="hero-grid">
          <article>
            <h2>Публичный сайт</h2>
            <p>
              На публичной части размещаются сведения о комитете, новости,
              заседания, каталог стандартов и открытые документы.
            </p>
          </article>
          <article>
            <h2>Кабинет участника</h2>
            <p>
              Участник видит назначенные циклы согласования, текущую редакцию
              проекта, свои замечания и итоговую позицию.
            </p>
          </article>
          <article>
            <h2>Кабинет секретариата</h2>
            <p>
              Секретариат контролирует ход цикла, ответы участников, статусы
              замечаний и итоговые позиции по каждому проекту.
            </p>
          </article>
        </div>
      </section>

      <section className="status-grid">
        <article>
          <div className="eyebrow">Уже доступно</div>
          <h2>Три независимые поверхности портала</h2>
          <p>
            Публичный сайт и внутренние рабочие кабинеты не смешиваются и могут
            развиваться независимо.
          </p>
        </article>
        <article>
          <div className="eyebrow">API и база</div>
          <h2>Локальная авторизация и реальный workflow</h2>
          <p>
            API уже хранит пользователей, сессии, организации, документы,
            проекты стандартов, циклы согласования и замечания участников.
          </p>
        </article>
        <article>
          <div className="eyebrow">Только локально</div>
          <h2>Без облачных зависимостей и внешнего SSO</h2>
          <p>
            MVP использует локальную инфраструктуру, Docker Compose и
            cookie-сессии без внешних провайдеров авторизации.
          </p>
        </article>
      </section>

      <section className="route-grid">
        <article>
          <h2>Разделы публичного сайта</h2>
          <p>
            Здесь размещаются открытые материалы комитета и служебная
            информация для внешних посетителей.
          </p>
          <div className="pill-row">
            <Link className="pill" href="/about">
              О комитете
            </Link>
            <Link className="pill" href="/documents">
              Документы
            </Link>
            <Link className="pill" href="/standards">
              Стандарты
            </Link>
            <Link className="pill" href="/meetings">
              Заседания
            </Link>
            <Link className="pill" href="/news">
              Новости
            </Link>
            <Link className="pill" href="/contacts">
              Контакты
            </Link>
          </div>
        </article>
        <article>
          <h2>Перейти в рабочий контур</h2>
          <p>
            Внутренние кабинеты уже позволяют пройти первый сценарий
            согласования: участник оставляет замечания, секретариат видит
            прогресс и ответы.
          </p>
          <div className="pill-row">
            <Link className="pill" href="/login">
              Страница входа
            </Link>
            <Link className="pill" href="/participant">
              Участник
            </Link>
            <Link className="pill" href="/secretariat">
              Секретариат
            </Link>
            <Link className="pill" href={apiBaseUrl}>
              Корень API
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}
