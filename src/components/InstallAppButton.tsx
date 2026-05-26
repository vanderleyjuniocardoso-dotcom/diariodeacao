import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Download, Share, Plus, MoreVertical } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const InstallAppButton = () => {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore
      window.navigator.standalone === true;
    setInstalled(isStandalone);

    // Pick up an event already captured in index.html before React mounted.
    // @ts-ignore
    const early = window.__deferredInstallPrompt as BIPEvent | null;
    if (early) setDeferred(early);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const earlyHandler = () => {
      // @ts-ignore
      const ev = window.__deferredInstallPrompt as BIPEvent | null;
      if (ev) setDeferred(ev);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("pwa-install-available", earlyHandler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("pwa-install-available", earlyHandler);
    };
  }, []);

  if (installed) return null;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  const requestNotifications = async () => {
    try {
      if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      if ("serviceWorker" in navigator) {
        const { subscribeToPush, isInIframe } = await import("@/lib/push");
        if (!isInIframe) await subscribeToPush().catch(() => {});
      }
    } catch {}
  };

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        await requestNotifications();
      }
      setDeferred(null);
    } else {
      await requestNotifications();
      setOpen(true);
    }
  };


  return (
    <>
      <Button
        variant="default"
        size="lg"
        className="w-full"
        onClick={handleClick}
      >
        <Download className="mr-2 h-4 w-4" />
        Baixar app
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Instalar VOLUNTAGRAM</DialogTitle>
            <DialogDescription>
              Adicione o VOLUNTAGRAM à tela inicial do seu celular para acesso rápido.
            </DialogDescription>
          </DialogHeader>

          {isIOS && (
            <div className="space-y-3 text-sm">
              <p className="font-medium">No iPhone (Safari):</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="flex items-center gap-2">
                  Toque no botão <Share className="h-4 w-4 inline" /> Compartilhar
                </li>
                <li className="flex items-center gap-2">
                  Escolha <Plus className="h-4 w-4 inline" /> "Adicionar à Tela de Início"
                </li>
                <li>Confirme em "Adicionar"</li>
              </ol>
            </div>
          )}

          {isAndroid && (
            <div className="space-y-3 text-sm">
              <p className="font-medium">No Android (Chrome):</p>
              <ol className="list-decimal pl-5 space-y-2">
                <li className="flex items-center gap-2">
                  Toque no menu <MoreVertical className="h-4 w-4 inline" /> (três pontos)
                </li>
                <li>Escolha "Instalar app" ou "Adicionar à tela inicial"</li>
                <li>Confirme a instalação</li>
              </ol>
            </div>
          )}

          {!isIOS && !isAndroid && (
            <div className="space-y-2 text-sm">
              <p>
                Abra este site no navegador do seu celular e use a opção
                "Adicionar à tela inicial" no menu do navegador.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default InstallAppButton;
