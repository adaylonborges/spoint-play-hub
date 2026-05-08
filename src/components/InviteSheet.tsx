import { useState } from "react";
import { Copy, MessageCircle, Check, X } from "lucide-react";

export function InviteSheet({ inviteCode, eventTitle, onClose }: { inviteCode: string; eventTitle: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/convite/${inviteCode}`;
  const waMsg = encodeURIComponent(`Bora pro ${eventTitle}? Confirma aí: ${url}`);

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-[430px] bg-card rounded-t-3xl p-6 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-lg">Convidar amigos</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        <p className="muted mb-4">Quem tiver o link entra direto no evento.</p>
        <div className="rounded-2xl bg-muted p-3 text-xs break-all mb-4 font-mono">{url}</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={copy} className="btn-ghost">
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado!" : "Copiar link"}
          </button>
          <a
            href={`https://wa.me/?text=${waMsg}`}
            target="_blank" rel="noopener noreferrer"
            className="btn-primary"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
