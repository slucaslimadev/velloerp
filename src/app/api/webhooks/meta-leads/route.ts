import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Verificação do webhook pelo Meta
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Receber notificação de novo lead
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Verificar assinatura da Meta para garantir que a requisição é legítima
  const signature = req.headers.get("x-hub-signature-256");
  if (signature) {
    const hmac = crypto.createHmac("sha256", process.env.META_APP_SECRET!);
    hmac.update(rawBody);
    const expected = `sha256=${hmac.digest("hex")}`;
    if (signature !== expected) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  }

  const payload = JSON.parse(rawBody);

  if (payload.object !== "page") {
    return NextResponse.json({ status: "ignored" });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "leadgen") {
        await processarLead(change.value);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}

async function processarLead(value: {
  leadgen_id: string;
  page_id: string;
  form_id: string;
  ad_id?: string;
  adgroup_id?: string;
  campaign_id?: string;
}) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${value.leadgen_id}` +
      `?fields=field_data,ad_name,adset_name,campaign_name` +
      `&access_token=${process.env.META_PAGE_ACCESS_TOKEN}`
  );

  if (!res.ok) {
    console.error("[meta-leads] Erro ao buscar lead:", await res.text());
    return;
  }

  const data = await res.json();

  // Mapear field_data para objeto chave-valor
  const campos: Record<string, string> = {};
  for (const field of data.field_data ?? []) {
    campos[field.name] = field.values?.[0] ?? "";
  }

  const nome =
    campos["full_name"] ?? campos["nome_completo"] ?? campos["name"] ?? null;

  const whatsapp =
    campos["whatsapp_number"] ??
    campos["phone_number"] ??
    campos["whatsapp"] ??
    campos["numero_do_whatsapp"] ??
    null;

  // Identificar campo de volume de leads pelo nome parcial
  const volumeKey = Object.keys(campos).find((k) => k.includes("lead"));
  const volume = volumeKey ? campos[volumeKey] : null;

  // Identificar campo de cidade pelo nome parcial
  const cidadeKey = Object.keys(campos).find((k) => k.includes("cidade"));
  const cidade = cidadeKey ? campos[cidadeKey] : null;

  const observacoes = [
    `Origem: Meta Ads`,
    data.campaign_name ? `Campanha: ${data.campaign_name}` : null,
    data.adset_name ? `Conjunto: ${data.adset_name}` : null,
    data.ad_name ? `Anúncio: ${data.ad_name}` : null,
    volume ? `Volume de leads/mês: ${volume}` : null,
    cidade ? `Cidade: ${cidade}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  await supabase.from("leads").insert({
    nome,
    whatsapp,
    segmento: "Concessionária de Veículos",
    tamanho_empresa: volume,
    status: "Novo",
    tentativas_requalificacao: 0,
    observacoes,
  });

  await notificarWhatsApp({ nome, whatsapp, volume, cidade, campanha: data.campaign_name });
}

async function notificarWhatsApp(lead: {
  nome: string | null;
  whatsapp: string | null;
  volume: string | null;
  cidade: string | null;
  campanha: string | null;
}) {
  const numero = process.env.ALERT_WHATSAPP_NUMBER;
  if (!numero) return;

  const mensagem = [
    `🎯 *Novo lead — Meta Ads*`,
    ``,
    `👤 *Nome:* ${lead.nome ?? "Não informado"}`,
    `📱 *WhatsApp:* ${lead.whatsapp ?? "Não informado"}`,
    lead.cidade ? `📍 *Cidade:* ${lead.cidade}` : null,
    lead.volume ? `📊 *Leads/mês:* ${lead.volume}` : null,
    lead.campanha ? `📣 *Campanha:* ${lead.campanha}` : null,
    ``,
    `Acesse: https://sistema.velloia.com.br/leads`,
  ]
    .filter((l) => l !== null)
    .join("\n");

  try {
    await fetch(
      `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.EVOLUTION_INSTANCE}`,
      {
        method: "POST",
        headers: {
          apikey: process.env.EVOLUTION_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ number: numero, text: mensagem }),
      }
    );
  } catch (err) {
    console.error("[meta-leads] Erro ao notificar WhatsApp:", err);
  }
}
