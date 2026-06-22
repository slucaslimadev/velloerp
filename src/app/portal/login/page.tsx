"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { VelloLogo } from "@/components/shared/VelloLogo";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }
    router.push("/portal");
    router.refresh();
  }

  const inputStyle = {
    background: "rgba(65, 190, 234, 0.05)",
    border: "1px solid var(--border-dim)",
    color: "var(--text-1)",
    fontFamily: "var(--ff-body)",
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#16171C] px-4">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(65,190,234,0.08) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-sm">
        <div className="flex justify-center mb-10">
          <VelloLogo iconSize={52} titleSize={32} showSubtitle />
        </div>

        <div className="rounded-[18px] p-8"
          style={{ background: "rgba(29, 31, 37, 0.9)", backdropFilter: "blur(14px)", border: "1px solid var(--border-dim)", boxShadow: "0 0 60px rgba(65, 190, 234, 0.06)" }}>
          <p className="text-center text-sm mb-6" style={{ color: "var(--text-3)" }}>
            Portal do cliente — acompanhe seu agente
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}>E-mail</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200" style={inputStyle} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}>Senha</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all duration-200" style={inputStyle} />
            </div>

            {error && <p className="text-sm text-red-400 text-center">{error}</p>}

            <button type="submit" disabled={loading}
              className="w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-60"
              style={{ background: "var(--grad)", boxShadow: "0 0 22px var(--glow-strong)", fontFamily: "var(--ff-head)" }}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "var(--text-3)" }}>
          Vello Inteligência Artificial · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
