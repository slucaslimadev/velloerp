import {
  Document, Page, Text, View, StyleSheet,
} from "@react-pdf/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropostaConteudo {
  nomeCliente: string;
  segmento: string;
  data: string;
  resumo_executivo: string;
  custo_inacao: { valor_mensal: string; descricao: string };
  por_que_agora: string;
  diagnostico: { titulo: string; descricao: string };
  solucao: { titulo: string; descricao: string; entregaveis: string[] };
  roi: { economia_mensal: string; payback: string; descricao: string };
  beneficios: string[];
  comparativo: string;
  investimento: { valor: string; descricao: string };
  garantia: string;
  prazo: string;
  proximos_passos: string[];
}

// ─── Cores ────────────────────────────────────────────────────────────────────

const C = {
  dark:    "#0F1117",
  surface: "#1D1F25",
  cyan:    "#41BEEA",
  cyanBg:  "#E8F8FD",
  cyanDark:"#1A4A5C",
  green:   "#22C55E",
  greenBg: "#F0FDF4",
  red:     "#EF4444",
  redBg:   "#FEF2F2",
  amber:   "#F59E0B",
  amberBg: "#FFFBEB",
  purple:  "#8B5CF6",
  text1:   "#1A1D27",
  text2:   "#4B5563",
  text3:   "#9CA3AF",
  white:   "#FFFFFF",
  border:  "#E5E7EB",
  accent:  "#2E59A6",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  coverPage:   { backgroundColor: C.dark, padding: 0 },
  contentPage: { backgroundColor: C.white, padding: 0, fontFamily: "Helvetica" },

  coverTop: { padding: "60 50 40 50", flex: 1, justifyContent: "space-between" },
  coverLogo:    { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 4 },
  coverSubLogo: { fontSize: 9, color: C.cyan, letterSpacing: 3, marginTop: 4 },
  coverAccentLine: { width: 48, height: 3, backgroundColor: C.cyan, marginTop: 40, marginBottom: 32, borderRadius: 2 },
  coverTitle:   { fontSize: 11, color: C.text3, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 },
  coverClient:  { fontSize: 32, fontFamily: "Helvetica-Bold", color: C.white, lineHeight: 1.2 },
  coverSegment: { fontSize: 14, color: C.cyan, marginTop: 10 },
  coverFooter:  { paddingHorizontal: 50, paddingBottom: 40, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  coverFooterText: { fontSize: 9, color: C.text3, fontFamily: "Helvetica" },

  pageHeader: { backgroundColor: C.dark, paddingHorizontal: 40, paddingVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  pageHeaderLogo: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 2 },
  pageHeaderRight: { fontSize: 8, color: C.text3, fontFamily: "Helvetica" },

  pageBody: { padding: "28 40 36 40", flex: 1 },

  sectionLabel: { fontSize: 8, letterSpacing: 2, color: C.cyan, fontFamily: "Helvetica-Bold", textTransform: "uppercase", marginBottom: 5 },
  sectionTitle: { fontSize: 18, fontFamily: "Helvetica-Bold", color: C.text1, marginBottom: 12, lineHeight: 1.3 },
  body: { fontSize: 10, color: C.text2, lineHeight: 1.7, fontFamily: "Helvetica" },

  divider: { height: 1, backgroundColor: C.border, marginVertical: 16 },

  // Alert boxes
  alertBox: { borderRadius: 6, padding: "12 14", marginTop: 12 },
  alertTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  alertBody:  { fontSize: 9.5, lineHeight: 1.6, fontFamily: "Helvetica" },

  // Cards row
  cardRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  card: { flex: 1, borderRadius: 6, padding: "12 14", borderLeft: `3 solid ${C.cyan}`, backgroundColor: C.cyanBg },
  cardTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.accent, marginBottom: 4 },
  cardBody:  { fontSize: 9, color: C.text2, lineHeight: 1.6, fontFamily: "Helvetica" },

  // Bullets
  bulletRow: { flexDirection: "row", marginBottom: 7, alignItems: "flex-start" },
  bulletDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.cyan, marginTop: 3.5, marginRight: 9, flexShrink: 0 },
  bulletText: { fontSize: 9.5, color: C.text2, lineHeight: 1.6, flex: 1, fontFamily: "Helvetica" },

  // Numbered
  numRow: { flexDirection: "row", marginBottom: 9, alignItems: "flex-start" },
  numBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: C.dark, marginRight: 9, flexShrink: 0, justifyContent: "center", alignItems: "center" },
  numBadgeText: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.white },
  numText: { fontSize: 9.5, color: C.text2, lineHeight: 1.6, flex: 1, fontFamily: "Helvetica" },

  // Investment
  investBox: { backgroundColor: C.dark, borderRadius: 8, padding: "16 20", marginTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  investLabel: { fontSize: 8, color: C.text3, fontFamily: "Helvetica", marginBottom: 3 },
  investValue: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.cyan },
  investDesc: { fontSize: 9, color: C.text3, fontFamily: "Helvetica", lineHeight: 1.5, flex: 1, marginLeft: 16 },

  // ROI box
  roiBox: { backgroundColor: C.greenBg, borderRadius: 8, padding: "14 16", marginTop: 12, flexDirection: "row", gap: 12 },
  roiItem: { flex: 1, alignItems: "center" },
  roiLabel: { fontSize: 8, color: C.text3, fontFamily: "Helvetica", marginBottom: 3 },
  roiValue: { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.green },

  // Guarantee
  guaranteeBox: { backgroundColor: C.greenBg, borderRadius: 8, padding: "14 16", marginTop: 12, borderLeft: `4 solid ${C.green}` },
  guaranteeTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.text1, marginBottom: 5 },

  // CTA
  ctaBox: { backgroundColor: C.cyanBg, borderRadius: 8, padding: "16 18", marginTop: 14, borderLeft: `4 solid ${C.cyan}` },
  ctaTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: C.text1, marginBottom: 5 },

  pageFooter: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 40, paddingBottom: 14 },
  footerText: { fontSize: 8, color: C.text3, fontFamily: "Helvetica" },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function PageHeader({ nomeCliente }: { nomeCliente: string }) {
  return (
    <View style={s.pageHeader}>
      <Text style={s.pageHeaderLogo}>VELLO</Text>
      <Text style={s.pageHeaderRight}>Proposta Comercial · {nomeCliente}</Text>
    </View>
  );
}

function PageFooter({ page }: { page: number }) {
  return (
    <View style={s.pageFooter}>
      <Text style={s.footerText}>VELLO Inteligência Artificial · velloia.com.br</Text>
      <Text style={s.footerText}>Página {page}</Text>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bulletRow}>
      <View style={s.bulletDot} />
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

function Numbered({ n, text }: { n: number; text: string }) {
  return (
    <View style={s.numRow}>
      <View style={s.numBadge}><Text style={s.numBadgeText}>{n}</Text></View>
      <Text style={s.numText}>{text}</Text>
    </View>
  );
}

// ─── Main Document ────────────────────────────────────────────────────────────

export function PropostaPDF({ c }: { c: PropostaConteudo }) {
  return (
    <Document title={`Proposta VELLO — ${c.nomeCliente}`} author="VELLO Inteligência Artificial">

      {/* ── CAPA ── */}
      <Page size="A4" style={s.coverPage}>
        <View style={s.coverTop}>
          <View>
            <Text style={s.coverLogo}>VELLO</Text>
            <Text style={s.coverSubLogo}>INTELIGÊNCIA ARTIFICIAL</Text>
          </View>
          <View>
            <View style={s.coverAccentLine} />
            <Text style={s.coverTitle}>Proposta Comercial</Text>
            <Text style={s.coverClient}>{c.nomeCliente}</Text>
            <Text style={s.coverSegment}>{c.segmento}</Text>
          </View>
        </View>
        <View style={s.coverFooter}>
          <Text style={s.coverFooterText}>Confidencial · Uso exclusivo do destinatário</Text>
          <Text style={[s.coverFooterText, { textAlign: "right" }]}>{c.data}{"\n"}velloia.com.br</Text>
        </View>
      </Page>

      {/* ── DIAGNÓSTICO + CUSTO DA INAÇÃO ── */}
      <Page size="A4" style={s.contentPage}>
        <PageHeader nomeCliente={c.nomeCliente} />
        <View style={s.pageBody}>
          <Text style={s.sectionLabel}>01 · Diagnóstico</Text>
          <Text style={s.sectionTitle}>{c.diagnostico.titulo}</Text>
          <Text style={s.body}>{c.diagnostico.descricao}</Text>

          <View style={s.divider} />

          {/* Custo da inação — Loss Aversion */}
          <View style={[s.alertBox, { backgroundColor: C.redBg, borderLeft: `4 solid ${C.red}` }]}>
            <Text style={[s.alertTitle, { color: C.red }]}>
              ⚠ Custo atual da inação: {c.custo_inacao?.valor_mensal}
            </Text>
            <Text style={[s.alertBody, { color: C.text2 }]}>{c.custo_inacao?.descricao}</Text>
          </View>

          <View style={s.divider} />

          {/* Por que agora */}
          <Text style={s.sectionLabel}>Por que agora?</Text>
          <Text style={s.body}>{c.por_que_agora}</Text>

          <View style={{ marginTop: 14 }}>
            <Text style={[s.body, { fontFamily: "Helvetica-Bold", color: C.text1, marginBottom: 4 }]}>Resumo Executivo</Text>
            <Text style={s.body}>{c.resumo_executivo}</Text>
          </View>
        </View>
        <PageFooter page={2} />
      </Page>

      {/* ── SOLUÇÃO + ROI ── */}
      <Page size="A4" style={s.contentPage}>
        <PageHeader nomeCliente={c.nomeCliente} />
        <View style={s.pageBody}>
          <Text style={s.sectionLabel}>02 · Solução Proposta</Text>
          <Text style={s.sectionTitle}>{c.solucao.titulo}</Text>
          <Text style={s.body}>{c.solucao.descricao}</Text>

          <View style={s.divider} />

          <Text style={s.sectionLabel}>O que será entregue</Text>
          <View style={{ marginTop: 8 }}>
            {c.solucao.entregaveis.map((e, i) => <Bullet key={i} text={e} />)}
          </View>

          <View style={s.divider} />

          {/* ROI */}
          <Text style={s.sectionLabel}>Retorno sobre Investimento</Text>
          <View style={s.roiBox}>
            <View style={s.roiItem}>
              <Text style={s.roiLabel}>Economia Estimada</Text>
              <Text style={s.roiValue}>{c.roi?.economia_mensal}</Text>
            </View>
            <View style={[s.roiItem, { borderLeft: `1 solid ${C.border}` }]}>
              <Text style={s.roiLabel}>Payback</Text>
              <Text style={s.roiValue}>{c.roi?.payback}</Text>
            </View>
          </View>
          <Text style={[s.body, { marginTop: 8 }]}>{c.roi?.descricao}</Text>

          <View style={s.divider} />

          {/* Benefícios */}
          <Text style={s.sectionLabel}>Benefícios Esperados</Text>
          <View style={s.cardRow}>
            {c.beneficios.slice(0, 2).map((b, i) => (
              <View key={i} style={s.card}><Text style={s.cardBody}>{b}</Text></View>
            ))}
          </View>
          {c.beneficios.length > 2 && (
            <View style={[s.cardRow, { marginTop: 8 }]}>
              {c.beneficios.slice(2, 4).map((b, i) => (
                <View key={i} style={s.card}><Text style={s.cardBody}>{b}</Text></View>
              ))}
            </View>
          )}
        </View>
        <PageFooter page={3} />
      </Page>

      {/* ── INVESTIMENTO + GARANTIA + PRÓXIMOS PASSOS ── */}
      <Page size="A4" style={s.contentPage}>
        <PageHeader nomeCliente={c.nomeCliente} />
        <View style={s.pageBody}>
          <Text style={s.sectionLabel}>03 · Investimento</Text>
          <Text style={s.sectionTitle}>Condições Comerciais</Text>

          {/* Comparativo — Anchoring */}
          <View style={[s.alertBox, { backgroundColor: C.amberBg, borderLeft: `3 solid ${C.amber}` }]}>
            <Text style={[s.alertBody, { color: C.text2, fontFamily: "Helvetica-Bold" }]}>💡 Comparativo</Text>
            <Text style={[s.alertBody, { color: C.text2, marginTop: 3 }]}>{c.comparativo}</Text>
          </View>

          <View style={s.investBox}>
            <View>
              <Text style={s.investLabel}>Investimento</Text>
              <Text style={s.investValue}>{c.investimento.valor}</Text>
              <Text style={[s.investLabel, { marginTop: 4 }]}>Prazo: {c.prazo}</Text>
            </View>
            <Text style={s.investDesc}>{c.investimento.descricao}</Text>
          </View>

          {/* Garantia — Risk Reversal */}
          <View style={s.guaranteeBox}>
            <Text style={s.guaranteeTitle}>✅ Nossa Garantia</Text>
            <Text style={[s.body, { color: C.text2 }]}>{c.garantia}</Text>
          </View>

          <View style={s.divider} />

          <Text style={s.sectionLabel}>04 · Próximos Passos</Text>
          <Text style={[s.sectionTitle, { fontSize: 15, marginBottom: 12 }]}>Como avançamos juntos</Text>
          <View>
            {c.proximos_passos.map((p, i) => <Numbered key={i} n={i + 1} text={p} />)}
          </View>

          <View style={s.ctaBox}>
            <Text style={s.ctaTitle}>Pronto para começar?</Text>
            <Text style={s.body}>
              Entre em contato com nossa equipe para dar início ao projeto.{"\n"}
              WhatsApp: (61) 9 9987-2122 · contato@velloia.com.br · velloia.com.br
            </Text>
          </View>
        </View>
        <PageFooter page={4} />
      </Page>

    </Document>
  );
}
