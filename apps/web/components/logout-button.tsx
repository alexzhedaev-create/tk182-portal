"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleLogout(): Promise<void> {
    setIsPending(true);
    setErrorMessage(null);

    const response = await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });

    if (!response.ok) {
      setErrorMessage("Logout failed. Please try again.");
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
        type="button"
        onClick={() => {
          void handleLogout();
        }}
        disabled={isPending}
      >
        {isPending ? "Signing out..." : "Sign out"}
      </button>
      {errorMessage ? (
        <p className="status-note status-note-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
