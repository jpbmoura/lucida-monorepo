"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (public/sw.js) no client, depois do load pra não
 * competir com o first paint. Só o suficiente pra instalabilidade do PWA —
 * o SW em si é network-only. Montado uma vez no root layout.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Falha de registro não deve quebrar nada — segue como web normal.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
