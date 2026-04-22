"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogout(): Promise<void> {
    setIsPending(true);
    setErrorMessage(null);

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage("Не удалось выполнить выход. Попробуйте еще раз.");
      setIsPending(false);
      return;
    }

    startTransition(() => {
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <div className="content-stack">
      <button
        className="pill pill-button"
        data-testid="logout-button"
        type="button"
        onClick={() => {
          void handleLogout();
        }}
        disabled={isPending}
      >
        {isPending ? "Выход..." : "Выйти"}
      </button>
      {errorMessage ? (
        <p className="status-note status-note-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
