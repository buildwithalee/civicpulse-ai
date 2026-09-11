"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthorityGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [checking, setChecking] =
    useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace(
          "/authority-login"
        );
        return;
      }

      setChecking(false);
    };

    checkSession();

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!session) {
            router.replace(
              "/authority-login"
            );
          }
        }
      );

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();

    router.replace(
      "/authority-login"
    );

    router.refresh();
  };

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">

        <div className="text-center">

          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />

          <p className="mt-4 text-sm text-slate-400">
            Verifying authority access...
          </p>

        </div>

      </main>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={logout}
        className="fixed bottom-5 right-5 z-[9999] rounded-xl border border-red-500/30 bg-slate-950/95 px-4 py-2 text-xs font-semibold text-red-300 shadow-xl"
      >
        🔒 Authority Logout
      </button>

      {children}
    </>
  );
}