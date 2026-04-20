"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const DISMISS_KEY = "etherpay.pwa-hint-dismissed";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const media = window.matchMedia("(display-mode: standalone)");
  const iosStandalone =
    "standalone" in window.navigator &&
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return media.matches || iosStandalone;
}

export function PWAInstallHint() {
  const [show, setShow] = useState(false);
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [ios, setIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    setIOS(detectIOS());

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallPromptEvent);
      setShow(true);
    };
    const onInstalled = () => {
      setShow(false);
      window.localStorage.setItem(DISMISS_KEY, "1");
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if (detectIOS()) {
      setShow(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!show) return null;

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
  }

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") {
      dismiss();
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-md border bg-muted/40 p-3 text-sm">
      <div className="flex-1 space-y-1">
        <div className="font-medium">Acesso rápido como aplicativo</div>
        {ios ? (
          <p className="text-xs text-muted-foreground">
            No Safari, toque em <strong>Compartilhar</strong> →{" "}
            <strong>Adicionar à Tela de Início</strong>.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Instale o EtherPay na tela inicial para abrir com um toque.
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {!ios && promptEvent && (
          <Button type="button" size="sm" onClick={install}>
            Instalar
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
          Dispensar
        </Button>
      </div>
    </div>
  );
}
