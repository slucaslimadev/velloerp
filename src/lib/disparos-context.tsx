"use client";

import { createContext, useContext, useRef, useState, useCallback } from "react";
import { PaperPlaneTilt, Check, X } from "@phosphor-icons/react";

interface DisparoItem {
  whatsapp: string;
  mensagem: string;
}

interface DisparosState {
  ativo: boolean;
  atual: number;
  total: number;
  countdown: number | null;
  concluido: boolean;
  falhas: number;
}

interface DisparosContextValue {
  state: DisparosState;
  iniciarEnvio: (items: DisparoItem[]) => void;
  fecharNotificacao: () => void;
}

const DisparosContext = createContext<DisparosContextValue | null>(null);

export function useDisparos() {
  const ctx = useContext(DisparosContext);
  if (!ctx) throw new Error("useDisparos must be used inside DisparosProvider");
  return ctx;
}

const IDLE: DisparosState = { ativo: false, atual: 0, total: 0, countdown: null, concluido: false, falhas: 0 };

export function DisparosProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DisparosState>(IDLE);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef(false);

  const fecharNotificacao = useCallback(() => {
    setState(IDLE);
  }, []);

  const iniciarEnvio = useCallback(async (items: DisparoItem[]) => {
    if (items.length === 0) return;

    abortRef.current = false;
    setState({ ativo: true, atual: 0, total: items.length, countdown: null, concluido: false, falhas: 0 });

    let falhas = 0;

    for (let i = 0; i < items.length; i++) {
      if (abortRef.current) break;

      const { whatsapp, mensagem } = items[i];
      try {
        await fetch("/api/conversas/iniciar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ whatsapp, mensagem }),
        });
      } catch {
        falhas++;
      }

      setState((prev) => ({ ...prev, atual: i + 1, falhas }));

      if (i < items.length - 1 && !abortRef.current) {
        const delaySec = Math.floor(Math.random() * (90 - 20 + 1)) + 20;
        setState((prev) => ({ ...prev, countdown: delaySec }));

        await new Promise<void>((resolve) => {
          let remaining = delaySec;
          countdownRef.current = setInterval(() => {
            remaining--;
            setState((prev) => ({ ...prev, countdown: remaining <= 0 ? null : remaining }));
            if (remaining <= 0) {
              clearInterval(countdownRef.current!);
              resolve();
            }
          }, 1000);
        });

        setState((prev) => ({ ...prev, countdown: null }));
      }
    }

    setState((prev) => ({ ...prev, ativo: false, concluido: true, countdown: null }));
  }, []);

  return (
    <DisparosContext.Provider value={{ state, iniciarEnvio, fecharNotificacao }}>
      {children}
      <DisparosToast state={state} onFechar={fecharNotificacao} />
    </DisparosContext.Provider>
  );
}

function DisparosToast({ state, onFechar }: { state: DisparosState; onFechar: () => void }) {
  if (!state.ativo && !state.concluido) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl px-5 py-4 shadow-2xl"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-dim)",
        minWidth: 280,
        maxWidth: 340,
      }}
    >
      {/* Icon */}
      <div
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center"
        style={{
          background: state.concluido ? "rgba(34,197,94,0.15)" : "rgba(65,190,234,0.15)",
          color: state.concluido ? "#22c55e" : "var(--cyan)",
        }}
      >
        {state.concluido ? <Check size={18} weight="bold" /> : <PaperPlaneTilt size={18} weight="fill" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {state.concluido ? (
          <>
            <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              Envio concluído
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
              {state.atual - state.falhas} de {state.total} mensagens enviadas
              {state.falhas > 0 && ` · ${state.falhas} falha${state.falhas > 1 ? "s" : ""}`}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              Enviando mensagens…
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-2)" }}>
              {state.atual} de {state.total} enviadas
              {state.countdown !== null && ` · próxima em ${state.countdown}s`}
            </p>
            {/* Progress bar */}
            <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: "var(--bg-surface)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round((state.atual / state.total) * 100)}%`,
                  background: "var(--cyan)",
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* Close (only when done) */}
      {state.concluido && (
        <button
          onClick={onFechar}
          className="flex-shrink-0 p-1 rounded-lg hover:opacity-70 transition-opacity"
          style={{ color: "var(--text-3)" }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
