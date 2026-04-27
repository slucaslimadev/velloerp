import { type NextRequest, NextResponse } from "next/server";

interface GoogleMapsItem {
  title: string;
  categoryName: string | null;
  phone: string;
  phoneUnformatted: string;
  address: string | null;
  city: string | null;
  state: string | null;
  website: string | null;
  url: string;
  totalScore: number | null;
  reviewsCount: number | null;
  permanentlyClosed: boolean;
  temporarilyClosed: boolean;
}

function normalizarDigitos(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("55") ? digits.slice(2) : digits;
}

function isCelularBrasileiro(phone: string): boolean {
  const sem55 = normalizarDigitos(phone);
  // Celular BR: DDD (2) + dígito 9 + 8 dígitos = 11 dígitos no total
  return sem55.length === 11 && sem55[2] === "9";
}

async function validarWhatsApp(phones: string[]): Promise<Set<string>> {
  const evoUrl = process.env.EVOLUTION_API_URL;
  const evoKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE ?? "vello";

  if (!evoUrl || !evoKey || phones.length === 0) return new Set(phones);

  const numerosComDDI = phones.map((p) => {
    const digits = normalizarDigitos(p);
    return `55${digits}`;
  });

  try {
    const res = await fetch(`${evoUrl}/chat/whatsappNumbers/${instance}`, {
      method: "POST",
      headers: { apikey: evoKey, "Content-Type": "application/json" },
      body: JSON.stringify({ numbers: numerosComDDI }),
    });

    if (!res.ok) {
      console.error("[apify/buscar] Evolution API erro:", res.status);
      return new Set(phones);
    }

    const data = await res.json();

    const lista = Array.isArray(data) ? data : Object.values(data);
    const validos = new Set<string>();

    for (const item of lista as Array<Record<string, unknown>>) {
      if (!item.exists) continue;
      // Usa "number" (o que enviamos, com nono dígito intacto) em vez de "jid"
      // porque a Evolution remove o nono dígito no jid: 5561995539000 → 556195539000
      const numero = (item.number ?? (item.jid as string)?.split("@")[0] ?? "") as string;
      validos.add(normalizarDigitos(numero));
    }

    return validos;
  } catch (err) {
    console.error("[apify/buscar] Erro ao validar WhatsApp:", err);
    return new Set(phones); // fallback: aceita todos se Evolution falhar
  }
}

function mapToLead(item: GoogleMapsItem) {
  const phone = item.phoneUnformatted?.replace(/\D/g, "") || null;

  const obsLines = [
    item.address   ? `Endereço: ${item.address}` : null,
    item.website   ? `Site: ${item.website}` : null,
    item.totalScore ? `Avaliação Google: ${item.totalScore} ⭐ (${item.reviewsCount ?? 0} avaliações)` : null,
    `Google Maps: ${item.url}`,
  ].filter(Boolean).join("\n");

  const pontuacao =
    (phone ? 20 : 0) +
    (item.website ? 15 : 0) +
    ((item.reviewsCount ?? 0) > 10 ? 15 : 0);

  const classificacao =
    pontuacao >= 40 ? "Morno" :
    pontuacao >= 20 ? "Frio"  : "Desqualificado";

  return {
    nome:          item.title || null,
    whatsapp:      phone,
    segmento:      item.categoryName || null,
    observacoes:   obsLines || null,
    status:        "Novo",
    classificacao,
    pontuacao,
    tentativas_requalificacao: 0,
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { busca, quantidade } = await req.json();

  if (!busca?.trim()) {
    return NextResponse.json({ error: "Campo busca é obrigatório" }, { status: 400 });
  }

  const count = Math.min(Number(quantidade) || 10, 50);
  const token = process.env.APIFY_API_TOKEN;

  if (!token) {
    return NextResponse.json({ error: "APIFY_API_TOKEN não configurado" }, { status: 500 });
  }

  // Pede mais resultados para compensar a filtragem de fixos
  const countComBuffer = Math.min(count * 3, 150);

  const apifyRes = await fetch(
    "https://api.apify.com/v2/acts/compass~google-maps-extractor/run-sync-get-dataset-items?timeout=120",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        searchStringsArray: [busca.trim()],
        maxCrawledPlacesPerSearch: countComBuffer,
        language: "pt-BR",
        scrapeReviews: false,
        scrapeImages: false,
      }),
    }
  );

  const items = await apifyRes.json();

  if (!Array.isArray(items)) {
    console.error("[apify/buscar] Resposta inesperada:", items);
    return NextResponse.json({ error: "Apify retornou erro", detail: items }, { status: 500 });
  }

  // Etapa 1: descarta fechados, sem título ou sem telefone
  const ativos = items.filter(
    (i: GoogleMapsItem) => !i.permanentlyClosed && !i.temporarilyClosed && i.title && i.phoneUnformatted
  );

  // Etapa 2: filtra apenas celulares brasileiros pelo formato
  const celulares = ativos.filter((i: GoogleMapsItem) => isCelularBrasileiro(i.phoneUnformatted));

  // Etapa 3: valida quais têm WhatsApp via Evolution API
  const phonesSemDDI = celulares.map((i: GoogleMapsItem) => normalizarDigitos(i.phoneUnformatted));
  const comWhatsApp = await validarWhatsApp(phonesSemDDI);

  const confirmados = celulares
    .filter((i: GoogleMapsItem) => comWhatsApp.has(normalizarDigitos(i.phoneUnformatted)))
    .slice(0, count);

  const leads = confirmados.map(mapToLead);

  console.log(
    `[apify/buscar] Apify: ${items.length} → celulares: ${celulares.length} → WhatsApp confirmado: ${leads.length}`
  );

  return NextResponse.json({ leads, total: leads.length });
}
