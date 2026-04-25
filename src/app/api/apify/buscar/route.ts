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

function mapToLead(item: GoogleMapsItem) {
  const phone = item.phoneUnformatted?.replace(/\D/g, "") || null;

  const obsLines = [
    item.address   ? `Endereço: ${item.address}` : null,
    item.website   ? `Site: ${item.website}` : null,
    item.totalScore ? `Avaliação Google: ${item.totalScore} ⭐ (${item.reviewsCount ?? 0} avaliações)` : null,
    `Google Maps: ${item.url}`,
  ].filter(Boolean).join("\n");

  // Rough scoring: phone present +20, website +15, reviews > 10 +15
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
        maxCrawledPlacesPerSearch: count,
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

  const leads = items
    .filter((i: GoogleMapsItem) => !i.permanentlyClosed && !i.temporarilyClosed && i.title)
    .map(mapToLead);

  return NextResponse.json({ leads, total: leads.length });
}
