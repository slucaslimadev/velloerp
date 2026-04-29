import {
  Document, Page, Text, View, StyleSheet, Font,
} from "@react-pdf/renderer";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PropostaConteudo {
  nomeCliente: string;
  segmento: string;
  data: string;
  resumo_executivo: string;
  diagnostico: { titulo: string; descricao: string };
  solucao: { titulo: string; descricao: string; entregaveis: string[] };
  beneficios: string[];
  investimento: { valor: string; descricao: string };
  prazo: string;
  proximos_passos: string[];
}

// ─── Cores ────────────────────────────────────────────────────────────────────

const C = {
  dark:    "#0F1117",
  surface: "#1D1F25",
  cyan:    "#41BEEA",
  cyanBg:  "#E8F8FD",
  text1:   "#1A1D27",
  text2:   "#4B5563",
  text3:   "#9CA3AF",
  white:   "#FFFFFF",
  border:  "#E5E7EB",
  accent:  "#2E59A6",
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Pages
  coverPage: { backgroundColor: C.dark, padding: 0 },
  contentPage: { backgroundColor: C.white, padding: 0, fontFamily: "Helvetica" },

  // Cover
  coverTop: {
    padding: "60 50 40 50",
    flex: 1,
    justifyContent: "space-between",
  },
  coverLogo: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    letterSpacing: 4,
  },
  coverSubLogo: {
    fontSize: 9,
    color: C.cyan,
    letterSpacing: 3,
    marginTop: 4,
  },
  coverAccentLine: {
    width: 48,
    height: 3,
    backgroundColor: C.cyan,
    marginTop: 40,
    marginBottom: 32,
    borderRadius: 2,
  },
  coverTitle: {
    fontSize: 11,
    color: C.text3,
    letterSpacing: 2,
    fontFamily: "Helvetica",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  coverClient: {
    fontSize: 32,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    lineHeight: 1.2,
  },
  coverSegment: {
    fontSize: 14,
    color: C.cyan,
    marginTop: 10,
    fontFamily: "Helvetica",
  },
  coverFooter: {
    paddingHorizontal: 50,
    paddingBottom: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  coverFooterLeft: { fontSize: 9, color: C.text3, fontFamily: "Helvetica" },
  coverFooterRight: { fontSize: 9, color: C.text3, fontFamily: "Helvetica", textAlign: "right" },

  // Content header
  pageHeader: {
    backgroundColor: C.dark,
    paddingHorizontal: 40,
    paddingVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageHeaderLogo: { fontSize: 12, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 2 },
  pageHeaderRight: { fontSize: 8, color: C.text3, fontFamily: "Helvetica" },

  // Content body
  pageBody: { padding: "32 40 40 40", flex: 1 },

  // Section
  sectionLabel: {
    fontSize: 8,
    letterSpacing: 2,
    color: C.cyan,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: C.text1,
    marginBottom: 16,
    lineHeight: 1.3,
  },
  sectionBody: {
    fontSize: 10.5,
    color: C.text2,
    lineHeight: 1.7,
    fontFamily: "Helvetica",
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 20,
  },

  // Cards
  cardRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  card: {
    flex: 1,
    backgroundColor: C.cyanBg,
    borderRadius: 6,
    padding: "14 16",
    borderLeft: `3 solid ${C.cyan}`,
  },
  cardTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.accent, marginBottom: 6 },
  cardBody: { fontSize: 9.5, color: C.text2, lineHeight: 1.6, fontFamily: "Helvetica" },

  // Bullets
  bulletRow: { flexDirection: "row", marginBottom: 8, alignItems: "flex-start" },
  bulletDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: C.cyan,
    marginTop: 3, marginRight: 10, flexShrink: 0,
  },
  bulletText: { fontSize: 10, color: C.text2, lineHeight: 1.6, flex: 1, fontFamily: "Helvetica" },

  // Numbered
  numRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-start" },
  numBadge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: C.dark,
    marginRight: 10, flexShrink: 0,
    justifyContent: "center", alignItems: "center",
  },
  numBadgeText: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.white },
  numText: { fontSize: 10, color: C.text2, lineHeight: 1.6, flex: 1, fontFamily: "Helvetica" },

  // Investment box
  investBox: {
    backgroundColor: C.dark,
    borderRadius: 8,
    padding: "20 24",
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  investLabel: { fontSize: 9, color: C.text3, fontFamily: "Helvetica", marginBottom: 4 },
  investValue: { fontSize: 22, fontFamily: "Helvetica-Bold", color: C.cyan },
  investDesc: { fontSize: 9.5, color: C.text3, fontFamily: "Helvetica", lineHeight: 1.5, flex: 1, marginLeft: 20 },

  // Footer
  pageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingBottom: 16,
  },
  footerText: { fontSize: 8, color: C.text3, fontFamily: "Helvetica" },

  // CTA box
  ctaBox: {
    backgroundColor: C.cyanBg,
    borderRadius: 8,
    padding: "18 20",
    marginTop: 20,
    borderLeft: `4 solid ${C.cyan}`,
  },
  ctaTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.text1, marginBottom: 6 },
  ctaText: { fontSize: 10, color: C.text2, lineHeight: 1.6, fontFamily: "Helvetica" },
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
          {/* Logo */}
          <View>
            <Text style={s.coverLogo}>VELLO</Text>
            <Text style={s.coverSubLogo}>INTELIGÊNCIA ARTIFICIAL</Text>
          </View>

          {/* Client info */}
          <View>
            <View style={s.coverAccentLine} />
            <Text style={s.coverTitle}>Proposta Comercial</Text>
            <Text style={s.coverClient}>{c.nomeCliente}</Text>
            <Text style={s.coverSegment}>{c.segmento}</Text>
          </View>
        </View>

        <View style={s.coverFooter}>
          <Text style={s.coverFooterLeft}>
            {"Confidencial · Uso exclusivo do destinatário"}
          </Text>
          <Text style={s.coverFooterRight}>
            {c.data}{"\n"}velloia.com.br
          </Text>
        </View>
      </Page>

      {/* ── DIAGNÓSTICO ── */}
      <Page size="A4" style={s.contentPage}>
        <PageHeader nomeCliente={c.nomeCliente} />
        <View style={s.pageBody}>
          <Text style={s.sectionLabel}>01 · Diagnóstico</Text>
          <Text style={s.sectionTitle}>{c.diagnostico.titulo}</Text>
          <Text style={s.sectionBody}>{c.diagnostico.descricao}</Text>

          <View style={s.divider} />

          <Text style={s.sectionLabel}>Resumo Executivo</Text>
          <Text style={s.sectionBody}>{c.resumo_executivo}</Text>
        </View>
        <PageFooter page={2} />
      </Page>

      {/* ── SOLUÇÃO ── */}
      <Page size="A4" style={s.contentPage}>
        <PageHeader nomeCliente={c.nomeCliente} />
        <View style={s.pageBody}>
          <Text style={s.sectionLabel}>02 · Solução Proposta</Text>
          <Text style={s.sectionTitle}>{c.solucao.titulo}</Text>
          <Text style={s.sectionBody}>{c.solucao.descricao}</Text>

          <View style={s.divider} />

          <Text style={s.sectionLabel}>O que será entregue</Text>
          <View style={{ marginTop: 10 }}>
            {c.solucao.entregaveis.map((e, i) => <Bullet key={i} text={e} />)}
          </View>

          <View style={s.divider} />

          <Text style={s.sectionLabel}>Benefícios Esperados</Text>
          <View style={s.cardRow}>
            {c.beneficios.slice(0, 2).map((b, i) => (
              <View key={i} style={s.card}>
                <Text style={s.cardBody}>{b}</Text>
              </View>
            ))}
          </View>
          {c.beneficios.length > 2 && (
            <View style={[s.cardRow, { marginTop: 8 }]}>
              {c.beneficios.slice(2, 4).map((b, i) => (
                <View key={i} style={s.card}>
                  <Text style={s.cardBody}>{b}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <PageFooter page={3} />
      </Page>

      {/* ── INVESTIMENTO ── */}
      <Page size="A4" style={s.contentPage}>
        <PageHeader nomeCliente={c.nomeCliente} />
        <View style={s.pageBody}>
          <Text style={s.sectionLabel}>03 · Investimento</Text>
          <Text style={s.sectionTitle}>Condições Comerciais</Text>

          <View style={s.investBox}>
            <View>
              <Text style={s.investLabel}>Investimento</Text>
              <Text style={s.investValue}>{c.investimento.valor}</Text>
              <Text style={[s.investLabel, { marginTop: 4 }]}>Prazo estimado: {c.prazo}</Text>
            </View>
            <Text style={s.investDesc}>{c.investimento.descricao}</Text>
          </View>

          <View style={s.divider} />

          <Text style={s.sectionLabel}>04 · Próximos Passos</Text>
          <Text style={[s.sectionTitle, { fontSize: 16, marginBottom: 14 }]}>
            Como avançamos juntos
          </Text>
          <View>
            {c.proximos_passos.map((p, i) => <Numbered key={i} n={i + 1} text={p} />)}
          </View>

          <View style={s.ctaBox}>
            <Text style={s.ctaTitle}>Pronto para começar?</Text>
            <Text style={s.ctaText}>
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
