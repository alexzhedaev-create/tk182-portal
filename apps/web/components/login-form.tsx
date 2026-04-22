"use client";

import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import type { AuthRole, LoginResponseDto } from "@tk182/shared-types";

import { canAccessWorkspace, getDefaultWorkspacePath } from "../lib/auth";

function getLoginDestination(role: AuthRole, requestedPath: string | null): string {
  if (requestedPath === "/participant" && canAccessWorkspace(role, "participant")) {
    return requestedPath;
  }

  if (requestedPath === "/secretariat" && canAccessWorkspace(role, "secretariat")) {
    return requestedPath;
  }

  return getDefaultWorkspacePath(role);
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsPending(true);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password
      })
    });

    const payload = (await response.json().catch(() => null)) as
      | LoginResponseDto
      | { message?: string }
      | null;

    if (!response.ok || !payload || !("user" in payload)) {
      setErrorMessage(
        payload?.message ?? "Не удалось выполнить вход. Проверьте логин и пароль."
      );
      setIsPending(false);
      return;
    }

    startTransition(() => {
      router.push(
        getLoginDestination(payload.user.role, searchParams?.get("next") ?? null)
      );
      router.refresh();
    });
  }

  return (
    <form className="content-card form-card" onSubmit={handleSubmit}>
      <h2>Вход в систему</h2>
      <p>
        Используйте один из локальных демо-аккаунтов, чтобы открыть кабинет
        участника или секретариата.
      </p>

      <label className="field-label">
        <span>Электронная почта</span>
        <input
          className="text-input"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          placeholder="participant@tk182.local"
          required
        />
      </label>

      <label className="field-label">
        <span>Пароль</span>
        <input
          className="text-input"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          placeholder="Введите пароль"
          required
        />
      </label>

      <div className="stack-actions">
        <button className="pill pill-button" type="submit" disabled={isPending}>
          {isPending ? "Вход..." : "Войти"}
        </button>
      </div>

      {errorMessage ? (
        <p className="status-note status-note-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
