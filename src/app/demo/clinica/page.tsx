"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── data ────────────────────────────────────────────────────── */
const TEAM = [
  { name: "Dra. Ana Carvalho", role: "Clínica Geral & Medicina Preventiva", crm: "CRM-DF 12.345", img: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=400&q=80" },
  { name: "Dr. Rafael Mendes", role: "Medicina Estética & Procedimentos", crm: "CRM-DF 23.456", img: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=400&q=80" },
  { name: "Dra. Camila Torres", role: "Nutrição Clínica & Metabologia", crm: "CRM-DF 34.567", img: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&w=400&q=80" },
  { name: "Dr. Lucas Ferreira", role: "Saúde Mental & Psiquiatria", crm: "CRM-DF 45.678", img: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=80" },
];

const CONVENIOS = ["Unimed","Bradesco Saúde","Amil","SulAmérica","Notre Dame","Hapvida","Porto Seguro","Postal Saúde","Geap","Cassi"];

const SERVICES = [
  { icon: "✦", title: "Medicina Preventiva", desc: "Check-ups completos, rastreamento de doenças e planos de saúde personalizados para cada fase da vida.", tag: "Consultas" },
  { icon: "◈", title: "Medicina Estética", desc: "Preenchimento, botox, bioestimuladores e tratamentos de pele com tecnologia de última geração.", tag: "Estética" },
  { icon: "⬡", title: "Procedimentos Cirúrgicos", desc: "Cirurgias minimamente invasivas com equipe especializada e acompanhamento pós-operatório completo.", tag: "Cirurgia" },
  { icon: "◎", title: "Nutrição Clínica", desc: "Avaliação nutricional completa com planos alimentares baseados em exames laboratoriais e genéticos.", tag: "Nutrição" },
  { icon: "⟡", title: "Saúde Mental", desc: "Psiquiatria, psicologia e terapias integrativas para equilíbrio emocional e qualidade de vida.", tag: "Bem-estar" },
  { icon: "⊕", title: "Medicina do Esporte", desc: "Avaliação física, prescrição de exercícios e recuperação de lesões para atletas e praticantes.", tag: "Esporte" },
];

const JOURNEY = [
  { n: "01", title: "Agendamento", desc: "Marque sua consulta pelo chat, WhatsApp ou telefone em menos de 2 minutos." },
  { n: "02", title: "Primeira Consulta", desc: "Anamnese completa, revisão de histórico e exame clínico detalhado em até 50 min." },
  { n: "03", title: "Plano Personalizado", desc: "Receba um plano de saúde individualizado com metas claras e acompanhamento contínuo." },
  { n: "04", title: "Acompanhamento", desc: "Retornos periódicos, exames online em 24h e contato direto com sua equipe médica." },
];

const FAQS = [
  { q: "A clínica aceita meu convênio?", a: "Atendemos os principais planos de saúde do mercado: Unimed, Bradesco, Amil, SulAmérica, Notre Dame, Hapvida e mais 20 convênios. Consulte nossa lista completa ou entre em contato para confirmar o seu." },
  { q: "Como funciona a primeira consulta?", a: "A primeira consulta tem duração média de 50 minutos. Inclui anamnese completa, avaliação de exames anteriores e elaboração do seu plano de saúde personalizado. Chegue 10 minutos antes com seu documento e cartão do convênio." },
  { q: "Quais especialidades vocês atendem?", a: "Clínica Geral, Medicina Preventiva, Medicina Estética, Nutrição Clínica, Saúde Mental, Medicina do Esporte e Procedimentos Cirúrgicos minimamente invasivos. Nossa equipe multidisciplinar garante cuidado integral." },
  { q: "Atendem crianças e idosos?", a: "Atendemos todas as faixas etárias. Temos profissionais especializados em medicina geriátrica e pediatria. Para crianças até 12 anos, recomendamos consulta prévia por telefone para encaminhamento correto." },
  { q: "Os resultados de exames ficam disponíveis online?", a: "Sim. Todos os resultados são disponibilizados em até 24 horas no portal do paciente, com acesso via app ou web. Você também recebe notificação por SMS quando os resultados estão prontos." },
  { q: "Vocês fazem teleconsulta?", a: "Sim, oferecemos teleconsulta para retornos, acompanhamentos e avaliações iniciais em algumas especialidades. O agendamento é feito pelo mesmo canal que as consultas presenciais." },
];

const TESTIMONIALS = [
  { name: "Fernanda Costa", role: "Paciente há 3 anos", text: "O atendimento aqui transformou minha relação com a saúde. O acompanhamento preventivo me fez detectar um problema precocemente. Sou eternamente grata.", initials: "FC" },
  { name: "Ricardo Alves", role: "Paciente há 5 anos", text: "Profissionalismo incomparável. Cada consulta é uma experiência completa — não apenas tratam, educam. Minha família toda é paciente da clínica.", initials: "RA" },
  { name: "Mariana Souza", role: "Paciente há 1 ano", text: "Fiz meu procedimento estético aqui e o resultado superou todas as expectativas. A equipe é altamente qualificada e o ambiente é impecável.", initials: "MS" },
];

const CHAT_SUGGESTIONS = ["Quero agendar uma consulta", "Quais procedimentos vocês oferecem?", "Como funciona o primeiro atendimento?"];
type Message = { role: "user" | "assistant"; text: string };

/* ─── FAQ item ────────────────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item${open ? " open" : ""}`} onClick={() => setOpen((o) => !o)}>
      <div className="faq-q">
        <span>{q}</span>
        <span className="faq-icon">{open ? "−" : "+"}</span>
      </div>
      <div className="faq-a" style={{ maxHeight: open ? 200 : 0 }}>
        <p>{a}</p>
      </div>
    </div>
  );
}

/* ─── page ────────────────────────────────────────────────────── */
export default function ClinicaDemo() {
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Olá! Sou a assistente virtual da Clínica Lumina. Como posso ajudar você hoje?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const msgEndRef = useRef<HTMLDivElement>(null);

  const [scrollY, setScrollY] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const rafRef = useRef<number>(0);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setScrollY(window.scrollY);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct((window.scrollY / total) * 100);
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll("[data-animate]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => { msgEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, typing]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || typing) return;
    setMessages((p) => [...p, { role: "user", text }]);
    setInput("");
    setTyping(true);
    await new Promise((r) => setTimeout(r, 1300));
    const l = text.toLowerCase();
    let reply = "Entendi! Nossa equipe pode te ajudar pessoalmente. Posso agendar um horário?";
    if (l.includes("agenda") || l.includes("consulta"))
      reply = "Ótimo! Qual especialidade você busca? Temos clínica geral, estética, nutrição, saúde mental e medicina do esporte disponíveis esta semana.";
    else if (l.includes("funciona") || l.includes("primeiro"))
      reply = "A primeira consulta dura cerca de 50 minutos — anamnese completa, revisão de exames e plano de saúde personalizado.";
    else if (l.includes("convenio") || l.includes("convênio") || l.includes("plano"))
      reply = "Atendemos Unimed, Bradesco, Amil, SulAmérica, Notre Dame, Hapvida e mais 20 convênios. Qual é o seu plano?";
    else if (l.includes("procedimento") || l.includes("estética") || l.includes("oferecem"))
      reply = "Realizamos botox, preenchimento, laser e cirurgias minimamente invasivas. Qual área te interessa?";
    setMessages((p) => [...p, { role: "assistant", text: reply }]);
    setTyping(false);
  };

  const videoParallax = scrollY * 0.4;
  const textParallax  = scrollY * 0.2;
  const heroOpacity   = Math.max(0, 1 - scrollY / 500);
  const navSolid      = scrollY > 60;
  const showStickyMobile = scrollY > 500;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        :root{
          --iv:#F7F4EF;--wh:#FFFFFF;
          --fo:#1B3A2D;--fol:#2A5040;
          --go:#C4A35A;--gol:#D4B870;
          --tx:#1C1C1C;--txm:#5A5A5A;--txl:#9A9A9A;
          --bd:rgba(27,58,45,0.1);
          --wa:#25D366;
        }
        html{scroll-behavior:smooth;}
        .lp{font-family:'Plus Jakarta Sans',sans-serif;background:var(--iv);color:var(--tx);overflow-x:hidden;}

        /* PROGRESS */
        .prog{position:fixed;top:0;left:0;height:2px;background:linear-gradient(90deg,var(--go),var(--gol));z-index:200;pointer-events:none;transition:width .05s;}

        /* NAV */
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:22px 60px;display:flex;align-items:center;justify-content:space-between;transition:all .35s;}
        .nav.solid{padding:14px 60px;background:rgba(247,244,239,.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--bd);}
        .nav-logo{font-family:'Cormorant Garamond',serif;font-size:1.55rem;font-weight:500;letter-spacing:.05em;color:#fff;transition:color .35s;}
        .nav.solid .nav-logo{color:var(--fo);}
        .nav-logo span{color:var(--go);}
        .nav-links{display:flex;gap:36px;list-style:none;}
        .nav-links a{font-size:.73rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.75);text-decoration:none;transition:color .2s;}
        .nav.solid .nav-links a{color:var(--txm);}
        .nav-links a:hover,.nav.solid .nav-links a:hover{color:var(--go);}
        .nav-cta{background:rgba(255,255,255,.15)!important;color:#fff!important;padding:9px 20px;border-radius:2px;backdrop-filter:blur(6px);}
        .nav.solid .nav-cta{background:var(--fo)!important;color:var(--iv)!important;backdrop-filter:none!important;}
        .nav-cta:hover{background:var(--go)!important;color:var(--fo)!important;}

        /* ── HERO ── */
        .hero{position:relative;height:100vh;overflow:hidden;}
        .hero-video-wrap{position:absolute;inset:0;overflow:hidden;}
        .hero-video{width:100%;height:115%;object-fit:cover;display:block;will-change:transform;}
        .hero-overlay{position:absolute;inset:0;background:linear-gradient(160deg,rgba(10,22,15,.6) 0%,rgba(10,22,15,.25) 45%,rgba(10,22,15,.7) 100%);}
        .hero-line{position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--go),transparent);}
        .hero-content{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 60px;will-change:transform;}
        .hero-avail{display:inline-flex;align-items:center;gap:8px;background:rgba(196,163,90,.18);border:1px solid rgba(196,163,90,.35);backdrop-filter:blur(8px);padding:7px 16px;border-radius:24px;font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--go);margin-bottom:24px;animation:fadeUp .7s ease .1s both;}
        .hero-avail-dot{width:7px;height:7px;border-radius:50%;background:#4ADE80;flex-shrink:0;animation:pulseDot 2s infinite;}
        @keyframes pulseDot{0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.4);}50%{box-shadow:0 0 0 6px rgba(74,222,128,0);}}
        .hero-tag{display:inline-flex;align-items:center;gap:10px;font-size:.68rem;font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--go);margin-bottom:22px;animation:fadeUp .8s ease .25s both;}
        .hero-tag::before,.hero-tag::after{content:'';display:block;width:28px;height:1px;background:var(--go);}
        .hero-h1{font-family:'Cormorant Garamond',serif;font-size:clamp(3.5rem,7vw,7rem);font-weight:300;line-height:1.05;color:#fff;max-width:900px;animation:fadeUp .9s ease .4s both;}
        .hero-h1 em{font-style:italic;color:var(--go);}
        .hero-desc{font-size:1.05rem;font-weight:300;line-height:1.8;color:rgba(255,255,255,.72);max-width:540px;margin:22px auto 40px;animation:fadeUp .9s ease .55s both;}
        .hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;animation:fadeUp .8s ease .7s both;}
        .btn-gold-solid{background:var(--go);color:var(--fo);padding:15px 36px;font-family:'Plus Jakarta Sans',sans-serif;font-size:.75rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;border:1.5px solid var(--go);cursor:pointer;transition:all .3s;text-decoration:none;display:inline-block;}
        .btn-gold-solid:hover{background:var(--gol);border-color:var(--gol);transform:translateY(-2px);box-shadow:0 8px 24px rgba(196,163,90,.4);}
        .btn-ghost{background:transparent;color:#fff;padding:15px 36px;font-family:'Plus Jakarta Sans',sans-serif;font-size:.75rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;border:1.5px solid rgba(255,255,255,.4);backdrop-filter:blur(6px);cursor:pointer;transition:all .3s;text-decoration:none;display:inline-block;}
        .btn-ghost:hover{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.7);}
        .hero-stats{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:center;background:rgba(10,22,15,.62);backdrop-filter:blur(16px);border-top:1px solid rgba(196,163,90,.18);animation:fadeUp .8s ease .85s both;}
        .hero-stat{flex:1;max-width:200px;padding:20px 24px;border-right:1px solid rgba(196,163,90,.12);text-align:center;}
        .hero-stat:last-child{border-right:none;}
        .hero-stat-n{font-family:'Cormorant Garamond',serif;font-size:2rem;font-weight:400;color:var(--go);line-height:1;}
        .hero-stat-l{font-size:.63rem;color:rgba(255,255,255,.4);letter-spacing:.08em;text-transform:uppercase;margin-top:4px;}
        .hero-scroll{position:absolute;bottom:88px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;color:rgba(255,255,255,.35);font-size:.58rem;letter-spacing:.15em;text-transform:uppercase;animation:fadeIn 1s ease 1.2s both;}
        .scroll-line{width:1px;height:42px;background:linear-gradient(to bottom,rgba(255,255,255,.35),transparent);animation:scrollDrop 1.8s ease-in-out infinite;}
        @keyframes scrollDrop{0%{transform:scaleY(0);transform-origin:top;}50%{transform:scaleY(1);transform-origin:top;}51%{transform-origin:bottom;}100%{transform:scaleY(0);transform-origin:bottom;}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(22px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}

        /* ── WAVE DIVIDER ── */
        .wave{display:block;width:100%;overflow:hidden;line-height:0;}
        .wave svg{display:block;width:100%;}

        /* ── SECTIONS ── */
        .lp-sec{padding:96px 60px;}
        .sec-tag{font-size:.66rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--go);display:flex;align-items:center;gap:10px;margin-bottom:18px;}
        .sec-tag::after{content:'';display:block;width:36px;height:1px;background:var(--go);}
        .sec-h2{font-family:'Cormorant Garamond',serif;font-size:clamp(2.2rem,4vw,3.4rem);font-weight:300;line-height:1.2;color:var(--fo);}
        .sec-h2 em{font-style:italic;color:var(--go);}
        .sec-h2-light{color:#F7F4EF;}
        .sec-h2-light em{color:var(--go);}

        /* ── ABOUT ── */
        .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;}
        .about-img{position:relative;overflow:visible;}
        .about-img img{width:100%;aspect-ratio:3/4;object-fit:cover;display:block;transition:transform .6s;}
        .about-img:hover img{transform:scale(1.02);}
        .about-accent{position:absolute;bottom:-22px;right:-22px;width:160px;height:160px;border:2px solid var(--go);pointer-events:none;animation:accentDrift 5s ease-in-out infinite;}
        @keyframes accentDrift{0%,100%{transform:translate(0,0);}50%{transform:translate(4px,-4px);}}
        .about-text{font-size:1rem;font-weight:300;line-height:1.9;color:var(--txm);margin:22px 0 32px;}
        .about-feats{display:flex;flex-direction:column;gap:16px;}
        .about-feat{display:flex;gap:14px;align-items:flex-start;padding:14px;border-radius:4px;transition:all .25s;cursor:default;}
        .about-feat:hover{background:rgba(196,163,90,.06);transform:translateX(4px);}
        .about-feat-ico{width:32px;height:32px;background:rgba(196,163,90,.1);display:flex;align-items:center;justify-content:center;color:var(--go);font-size:.85rem;flex-shrink:0;}
        .about-feat-h{font-family:'Cormorant Garamond',serif;font-size:1.05rem;font-weight:500;color:var(--fo);margin-bottom:3px;}
        .about-feat-p{font-size:.82rem;color:var(--txm);line-height:1.6;}

        /* ── NUMBERS ── */
        .nums-bg{background:var(--fo);}
        .nums{display:grid;grid-template-columns:repeat(4,1fr);}
        .num-item{padding:48px 36px;text-align:center;border-right:1px solid rgba(255,255,255,.07);}
        .num-item:last-child{border-right:none;}
        .num-n{font-family:'Cormorant Garamond',serif;font-size:2.8rem;font-weight:300;color:var(--go);line-height:1;}
        .num-l{font-size:.68rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:rgba(247,244,239,.4);margin-top:10px;}

        /* ── TEAM ── */
        .team-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2px;margin-top:56px;}
        .team-card{position:relative;overflow:hidden;background:var(--wh);}
        .team-card img{width:100%;aspect-ratio:3/4;object-fit:cover;object-position:top;display:block;transition:transform .5s ease;}
        .team-card:hover img{transform:scale(1.04);}
        .team-overlay{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(10,22,15,.92) 0%,rgba(10,22,15,.4) 50%,transparent 100%);padding:32px 24px 24px;transition:padding .3s;}
        .team-name{font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:500;color:#F7F4EF;margin-bottom:4px;}
        .team-role{font-size:.72rem;color:var(--go);font-weight:500;letter-spacing:.04em;margin-bottom:4px;}
        .team-crm{font-size:.65rem;color:rgba(247,244,239,.4);letter-spacing:.06em;}
        .team-cta{display:inline-block;margin-top:12px;font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--go);border-bottom:1px solid rgba(196,163,90,.4);padding-bottom:2px;opacity:0;transform:translateY(8px);transition:all .3s;cursor:pointer;background:none;border-left:none;border-right:none;border-top:none;}
        .team-card:hover .team-cta{opacity:1;transform:translateY(0);}

        /* ── JOURNEY ── */
        .journey-bg{background:var(--iv);}
        .journey-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:56px;position:relative;}
        .journey-grid::before{content:'';position:absolute;top:28px;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,var(--go),transparent);pointer-events:none;}
        .journey-item{padding:0 24px;text-align:center;}
        .journey-num{width:56px;height:56px;border-radius:50%;background:var(--fo);color:var(--go);font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:500;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;border:2px solid rgba(196,163,90,.3);position:relative;z-index:1;}
        .journey-title{font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-weight:500;color:var(--fo);margin-bottom:10px;}
        .journey-desc{font-size:.83rem;line-height:1.75;color:var(--txm);}

        /* ── CONVENIOS ── */
        .conv-bg{background:var(--wh);}
        .conv-strip{display:flex;flex-wrap:wrap;gap:10px;margin-top:36px;justify-content:center;}
        .conv-pill{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border:1px solid var(--bd);border-radius:4px;font-size:.78rem;font-weight:500;color:var(--fo);background:var(--iv);transition:all .25s;cursor:default;}
        .conv-pill::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--go);flex-shrink:0;}
        .conv-pill:hover{border-color:var(--go);background:#fff;box-shadow:0 4px 16px rgba(27,58,45,.08);}
        .conv-note{margin-top:20px;font-size:.82rem;color:var(--txl);text-align:center;}
        .conv-note a{color:var(--fo);font-weight:600;text-decoration:underline;text-underline-offset:3px;}

        /* ── SERVICES ── */
        .svc-bg{background:var(--iv);}
        .svc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:52px;}
        .svc-card{background:var(--wh);padding:40px 36px;transition:all .4s;position:relative;overflow:hidden;}
        .svc-card::before{content:'';position:absolute;bottom:0;left:0;width:100%;height:3px;background:linear-gradient(90deg,var(--go),var(--gol));transform:scaleX(0);transform-origin:left;transition:transform .4s;}
        .svc-card:hover::before{transform:scaleX(1);}
        .svc-card:hover{background:var(--fo);transform:translateY(-4px);box-shadow:0 20px 40px rgba(27,58,45,.18);}
        .svc-card:hover .svc-icon,.svc-card:hover .svc-title{color:var(--iv);}
        .svc-card:hover .svc-pill{color:rgba(247,244,239,.4);border-color:rgba(247,244,239,.12);}
        .svc-card:hover .svc-desc{color:rgba(247,244,239,.65);}
        .svc-icon{font-size:1.4rem;color:var(--go);display:block;margin-bottom:18px;}
        .svc-pill{font-size:.6rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--txl);border:1px solid var(--bd);padding:4px 10px;border-radius:20px;display:inline-block;margin-bottom:12px;transition:all .4s;}
        .svc-title{font-family:'Cormorant Garamond',serif;font-size:1.4rem;font-weight:500;color:var(--fo);margin-bottom:10px;transition:color .4s;}
        .svc-desc{font-size:.875rem;line-height:1.75;color:var(--txm);transition:color .4s;}

        /* ── FAQ ── */
        .faq-bg{background:var(--fo);}
        .faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-top:52px;}
        .faq-item{background:rgba(255,255,255,.05);padding:24px 28px;cursor:pointer;transition:background .25s;border-bottom:1px solid rgba(255,255,255,.06);}
        .faq-item:hover,.faq-item.open{background:rgba(255,255,255,.09);}
        .faq-q{display:flex;justify-content:space-between;align-items:center;gap:16px;font-weight:500;font-size:.92rem;color:#F7F4EF;line-height:1.4;}
        .faq-icon{font-size:1.3rem;color:var(--go);flex-shrink:0;transition:transform .3s;font-weight:300;}
        .faq-item.open .faq-icon{transform:rotate(180deg);}
        .faq-a{overflow:hidden;transition:max-height .35s ease;}
        .faq-a p{padding-top:14px;font-size:.85rem;line-height:1.8;color:rgba(247,244,239,.6);font-weight:300;}

        /* ── TESTIMONIALS ── */
        .tst-bg{background:var(--wh);}
        .tst-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:52px;}
        .tst-card{background:var(--iv);padding:40px 36px;transition:all .35s;position:relative;overflow:hidden;}
        .tst-card::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--go);transform:scaleX(0);transform-origin:left;transition:transform .4s;}
        .tst-card:hover::after{transform:scaleX(1);}
        .tst-card:hover{background:var(--wh);box-shadow:0 16px 48px rgba(27,58,45,.1);transform:translateY(-4px);}
        .tst-stars{color:var(--go);letter-spacing:3px;margin-bottom:16px;font-size:.72rem;}
        .tst-q{font-family:'Cormorant Garamond',serif;font-size:1.1rem;font-weight:300;font-style:italic;line-height:1.85;color:var(--txm);margin-bottom:24px;}
        .tst-auth{display:flex;align-items:center;gap:12px;}
        .tst-av{width:42px;height:42px;border-radius:50%;background:rgba(196,163,90,.12);display:flex;align-items:center;justify-content:center;font-family:'Cormorant Garamond',serif;font-size:.88rem;color:var(--go);border:1.5px solid rgba(196,163,90,.22);}
        .tst-name{font-weight:600;font-size:.85rem;color:var(--fo);}
        .tst-role{font-size:.68rem;color:var(--txl);margin-top:2px;}

        /* ── CTA BAR ── */
        .cta-bar{background:var(--go);padding:80px 60px;display:flex;align-items:center;justify-content:space-between;gap:40px;position:relative;overflow:hidden;}
        .cta-bar::before{content:'';position:absolute;right:-60px;top:-60px;width:300px;height:300px;border-radius:50%;background:rgba(255,255,255,.1);pointer-events:none;}
        .cta-bar::after{content:'';position:absolute;left:-40px;bottom:-50px;width:200px;height:200px;border-radius:50%;background:rgba(27,58,45,.06);pointer-events:none;}
        .cta-h{font-family:'Cormorant Garamond',serif;font-size:clamp(2rem,3.5vw,3rem);font-weight:300;color:var(--fo);line-height:1.2;position:relative;z-index:1;}
        .cta-actions{display:flex;gap:12px;flex-wrap:wrap;position:relative;z-index:1;}
        .btn-dark{background:var(--fo);color:var(--iv);padding:17px 40px;font-family:'Plus Jakarta Sans',sans-serif;font-size:.75rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;border:none;cursor:pointer;transition:all .3s;white-space:nowrap;}
        .btn-dark:hover{background:var(--fol);transform:translateY(-2px);box-shadow:0 10px 28px rgba(27,58,45,.25);}
        .btn-wa-cta{background:var(--wa);color:#fff;padding:17px 36px;font-family:'Plus Jakarta Sans',sans-serif;font-size:.75rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;border:none;cursor:pointer;transition:all .3s;display:flex;align-items:center;gap:8px;white-space:nowrap;}
        .btn-wa-cta:hover{filter:brightness(1.1);transform:translateY(-2px);}

        /* ── FOOTER ── */
        .footer{background:#0B1810;color:rgba(247,244,239,.5);padding:64px 60px 40px;}
        .ft-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:60px;padding-bottom:48px;border-bottom:1px solid rgba(255,255,255,.06);}
        .ft-logo{font-family:'Cormorant Garamond',serif;font-size:1.6rem;color:#F7F4EF;margin-bottom:14px;}
        .ft-logo span{color:var(--go);}
        .ft-desc{font-size:.82rem;line-height:1.85;max-width:280px;}
        .ft-badge{display:inline-flex;align-items:center;gap:6px;margin-top:16px;background:rgba(196,163,90,.1);border:1px solid rgba(196,163,90,.2);padding:6px 12px;font-size:.62rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--go);}
        .ft-col-h{font-size:.64rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#F7F4EF;margin-bottom:20px;}
        .ft-links{list-style:none;display:flex;flex-direction:column;gap:12px;}
        .ft-links a{color:rgba(247,244,239,.5);text-decoration:none;font-size:.82rem;transition:color .2s;}
        .ft-links a:hover{color:var(--go);}
        .ft-bot{display:flex;justify-content:space-between;align-items:center;margin-top:32px;font-size:.72rem;}
        .ft-vello{color:var(--go);font-weight:600;}

        /* SCROLL REVEAL */
        [data-animate]{opacity:0;transform:translateY(26px);transition:opacity .7s ease,transform .7s ease;}
        [data-animate][data-dir="left"]{transform:translateX(-30px);}
        [data-animate][data-dir="right"]{transform:translateX(30px);}
        [data-animate][data-dir="scale"]{transform:scale(.95);}
        [data-animate].visible{opacity:1;transform:none;}

        /* STICKY MOBILE CTA */
        .sticky-mobile{display:none;position:fixed;bottom:0;left:0;right:0;z-index:90;background:var(--fo);padding:14px 20px;border-top:2px solid var(--go);transition:transform .3s;box-shadow:0 -8px 32px rgba(0,0,0,.2);}
        .sticky-mobile-inner{display:flex;gap:10px;}
        .sticky-mobile-btn{flex:1;background:var(--go);color:var(--fo);border:none;padding:13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;border-radius:2px;}
        .sticky-mobile-wa{flex:1;background:var(--wa);color:#fff;border:none;padding:13px;font-family:'Plus Jakarta Sans',sans-serif;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;border-radius:2px;display:flex;align-items:center;justify-content:center;gap:6px;}

        /* FLOATING ACTIONS */
        .float-actions{position:fixed;bottom:28px;right:28px;z-index:1000;display:flex;flex-direction:column;gap:12px;align-items:flex-end;}
        .wa-btn{width:52px;height:52px;background:var(--wa);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 24px rgba(37,211,102,.4);transition:all .3s;border:none;text-decoration:none;}
        .wa-btn:hover{transform:scale(1.1);box-shadow:0 10px 32px rgba(37,211,102,.5);}
        .wa-btn svg{width:24px;height:24px;fill:#fff;}
        .chat-btn{width:52px;height:52px;background:var(--fo);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 28px rgba(27,58,45,.4);transition:all .3s;position:relative;border:2px solid var(--go);}
        .chat-btn::before{content:'';position:absolute;inset:-5px;border-radius:50%;border:1px solid rgba(196,163,90,.25);animation:chatRing 2.2s ease-in-out infinite;}
        @keyframes chatRing{0%,100%{transform:scale(1);opacity:.5;}50%{transform:scale(1.2);opacity:0;}}
        .chat-btn:hover{transform:scale(1.08);}
        .chat-notif{position:absolute;top:-3px;right:-3px;width:15px;height:15px;background:var(--go);border-radius:50%;font-size:.55rem;font-weight:700;color:var(--fo);display:flex;align-items:center;justify-content:center;}

        /* CHAT WINDOW */
        .chat-win{position:absolute;bottom:68px;right:0;width:364px;background:#fff;border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.18);overflow:hidden;display:flex;flex-direction:column;max-height:520px;animation:chatUp .3s cubic-bezier(.34,1.2,.64,1);}
        @keyframes chatUp{from{opacity:0;transform:translateY(16px) scale(.96);}to{opacity:1;transform:none;}}
        .chat-hd{background:var(--fo);padding:14px 18px;display:flex;align-items:center;gap:12px;}
        .chat-hd-av{width:36px;height:36px;background:rgba(196,163,90,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.95rem;border:1.5px solid var(--go);flex-shrink:0;}
        .chat-hd-name{color:#F7F4EF;font-weight:600;font-size:.86rem;}
        .chat-hd-st{color:rgba(247,244,239,.5);font-size:.67rem;display:flex;align-items:center;gap:5px;margin-top:2px;}
        .chat-hd-st::before{content:'';display:inline-block;width:6px;height:6px;background:#4ADE80;border-radius:50%;animation:blink 2s infinite;}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}
        .chat-x{color:rgba(247,244,239,.5);background:none;border:none;cursor:pointer;font-size:1.25rem;margin-left:auto;padding:4px;transition:color .2s;}
        .chat-x:hover{color:#F7F4EF;}
        .chat-msgs{overflow-y:auto;padding:16px 12px;display:flex;flex-direction:column;gap:10px;min-height:250px;max-height:290px;background:#F9F9F7;}
        .chat-msg{max-width:86%;padding:10px 14px;border-radius:12px;font-size:.83rem;line-height:1.65;animation:msgIn .3s ease;}
        @keyframes msgIn{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:none;}}
        .chat-msg.assistant{background:#fff;color:var(--tx);border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.06);align-self:flex-start;}
        .chat-msg.user{background:var(--fo);color:#fff;border-bottom-right-radius:4px;align-self:flex-end;}
        .chat-typing{background:#fff;padding:10px 14px;border-radius:12px;border-bottom-left-radius:4px;align-self:flex-start;box-shadow:0 1px 4px rgba(0,0,0,.06);}
        .typing-dots span{display:inline-block;width:6px;height:6px;background:var(--txl);border-radius:50%;margin:0 2px;animation:dot 1.2s infinite;}
        .typing-dots span:nth-child(2){animation-delay:.2s;}.typing-dots span:nth-child(3){animation-delay:.4s;}
        @keyframes dot{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}
        .chat-sugg{padding:10px 12px;display:flex;flex-direction:column;gap:6px;border-top:1px solid rgba(0,0,0,.05);background:#fff;}
        .chat-sg{background:var(--iv);border:1px solid var(--bd);color:var(--fo);padding:7px 12px;border-radius:20px;font-size:.75rem;cursor:pointer;transition:all .2s;text-align:left;font-family:'Plus Jakarta Sans',sans-serif;}
        .chat-sg:hover{background:var(--fo);color:var(--iv);}
        .chat-inp-row{padding:10px 12px;display:flex;gap:8px;border-top:1px solid rgba(0,0,0,.06);background:#fff;}
        .chat-inp{flex:1;border:1px solid var(--bd);border-radius:24px;padding:9px 16px;font-family:'Plus Jakarta Sans',sans-serif;font-size:.83rem;color:var(--tx);background:var(--iv);outline:none;transition:border-color .2s;}
        .chat-inp:focus{border-color:var(--fo);}
        .chat-send{width:35px;height:35px;background:var(--fo);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;flex-shrink:0;}
        .chat-send:hover{background:var(--fol);transform:scale(1.08);}
        .chat-pw{padding:6px 12px;text-align:center;font-size:.6rem;color:var(--txl);background:#fff;border-top:1px solid rgba(0,0,0,.04);}
        .chat-pw a{color:var(--fo);font-weight:600;text-decoration:none;}

        /* RESPONSIVE */
        @media(max-width:900px){
          .nav{padding:14px 20px!important;}.nav-links{display:none;}
          .lp-sec{padding:64px 20px;}
          .hero-content{padding:0 20px;}
          .hero-stats{display:none;}
          .about-grid{grid-template-columns:1fr;}.about-img{display:none;}
          .nums{grid-template-columns:1fr 1fr;}
          .team-grid{grid-template-columns:1fr 1fr;}
          .journey-grid{grid-template-columns:1fr 1fr;gap:32px;}.journey-grid::before{display:none;}
          .svc-grid{grid-template-columns:1fr;}
          .faq-grid{grid-template-columns:1fr;}
          .tst-grid{grid-template-columns:1fr;}
          .cta-bar{flex-direction:column;text-align:center;padding:56px 20px;}
          .ft-top{grid-template-columns:1fr 1fr;gap:28px;}
          .ft-bot{flex-direction:column;gap:8px;text-align:center;}
          .sticky-mobile{display:block;}
          .float-actions{bottom:88px;}
          .chat-win{width:calc(100vw - 48px);right:-14px;}
        }
      `}</style>

      <div className="prog" style={{ width: `${scrollPct}%` }} />

      {/* ── NAV ── */}
      <nav className={`nav${navSolid ? " solid" : ""}`}>
        <div className="nav-logo">Lumina<span>.</span></div>
        <ul className="nav-links">
          <li><a href="#equipe">Equipe</a></li>
          <li><a href="#servicos">Serviços</a></li>
          <li><a href="#convenios">Convênios</a></li>
          <li><a href="#faq">Dúvidas</a></li>
          <li><a href="#contato" className="nav-cta">Agendar</a></li>
        </ul>
      </nav>

      <div className="lp">

        {/* ── HERO ── */}
        <section className="hero">
          <div className="hero-video-wrap">
            <video
              className="hero-video"
              autoPlay muted loop playsInline
              style={{ transform: `translateY(${videoParallax}px)` }}
            >
              <source src="/clinica-scrub.mp4" type="video/mp4" />
            </video>
          </div>
          <div className="hero-overlay" />

          <div className="hero-content" style={{ transform: `translateY(${-textParallax}px)`, opacity: heroOpacity }}>
            <div className="hero-avail">
              <span className="hero-avail-dot" />
              Próxima consulta disponível: hoje, 14h30
            </div>
            <div className="hero-tag">Medicina de Excelência — Brasília, DF</div>
            <h1 className="hero-h1">
              Sua saúde,<br /><em>cuidada</em> com precisão.
            </h1>
            <p className="hero-desc">
              Cuidado médico de alto nível com abordagem integrativa, tecnologia de ponta
              e uma equipe dedicada ao seu bem-estar completo.
            </p>
            <div className="hero-actions">
              <button className="btn-gold-solid" onClick={() => setChatOpen(true)}>Agendar Consulta</button>
              <a href="#equipe" className="btn-ghost">Conheça nossa equipe</a>
            </div>
          </div>

          <div className="hero-stats" style={{ opacity: heroOpacity }}>
            {[
              { n: "12+", l: "Anos de experiência" },
              { n: "8.000+", l: "Pacientes atendidos" },
              { n: "18", l: "Especialidades" },
              { n: "★ 4.9", l: "Avaliação média" },
            ].map((s) => (
              <div className="hero-stat" key={s.l}>
                <div className="hero-stat-n">{s.n}</div>
                <div className="hero-stat-l">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="hero-scroll" style={{ opacity: heroOpacity }}>
            <div className="scroll-line" /><span>Role para explorar</span>
          </div>
          <div className="hero-line" />
        </section>

        {/* ── WAVE ── */}
        <div className="wave" style={{ background: "#F7F4EF", marginTop: -2 }}>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ height: 48 }}>
            <path d="M0,48 C360,0 1080,0 1440,48 L1440,0 L0,0 Z" fill="#0B1810" />
          </svg>
        </div>

        {/* ── ABOUT ── */}
        <section className="lp-sec" style={{ background: "var(--iv)" }} id="sobre">
          <div className="about-grid">
            <div className="about-img" data-animate data-dir="left">
              <img src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=700&q=80" alt="Clínica Lumina" />
              <div className="about-accent" />
            </div>
            <div data-animate data-dir="right" style={{ transitionDelay: "100ms" }}>
              <div className="sec-tag">Nossa clínica</div>
              <h2 className="sec-h2">Medicina com <em>propósito</em><br />e humanidade</h2>
              <p className="about-text">
                A Clínica Lumina nasceu da convicção de que a saúde vai além do tratamento de doenças.
                Somos um espaço onde tecnologia de ponta encontra o cuidado humanizado, com foco
                na prevenção e qualidade de vida duradoura de cada paciente.
              </p>
              <div className="about-feats">
                {[
                  { ico: "✦", h: "Abordagem integrativa", p: "Tratamos a pessoa como um todo, não apenas os sintomas." },
                  { ico: "◎", h: "Tecnologia de última geração", p: "Diagnósticos precisos com equipamentos modernos." },
                  { ico: "⬡", h: "Equipe multidisciplinar", p: "Médicos, nutricionistas e psicólogos em sinergia." },
                ].map((f, i) => (
                  <div className="about-feat" key={f.h} data-animate style={{ transitionDelay: `${150 + i * 80}ms` }}>
                    <div className="about-feat-ico">{f.ico}</div>
                    <div><div className="about-feat-h">{f.h}</div><p className="about-feat-p">{f.p}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── NUMBERS ── */}
        <div className="nums-bg">
          <div className="nums">
            {[
              { n: "98%", l: "Satisfação dos pacientes" },
              { n: "15min", l: "Tempo médio de espera" },
              { n: "24h", l: "Exames disponíveis online" },
              { n: "ISO 9001", l: "Certificação de qualidade" },
            ].map((item, i) => (
              <div className="num-item" key={i} data-animate data-dir="scale" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="num-n">{item.n}</div>
                <div className="num-l">{item.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── WAVE ── */}
        <div className="wave" style={{ background: "var(--iv)" }}>
          <svg viewBox="0 0 1440 48" preserveAspectRatio="none" style={{ height: 48 }}>
            <path d="M0,0 C360,48 1080,48 1440,0 L1440,48 L0,48 Z" fill="#0B1810" />
          </svg>
        </div>

        {/* ── TEAM ── */}
        <section className="lp-sec" style={{ background: "var(--iv)" }} id="equipe">
          <div data-animate>
            <div className="sec-tag">Nossa equipe</div>
            <h2 className="sec-h2">Especialistas dedicados<br />ao seu <em>cuidado</em></h2>
          </div>
          <div className="team-grid">
            {TEAM.map((d, i) => (
              <div className="team-card" key={i} data-animate style={{ transitionDelay: `${i * 80}ms` }}>
                <img src={d.img} alt={d.name} />
                <div className="team-overlay">
                  <div className="team-name">{d.name}</div>
                  <div className="team-role">{d.role}</div>
                  <div className="team-crm">{d.crm}</div>
                  <button className="team-cta" onClick={() => setChatOpen(true)}>Agendar consulta →</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── JOURNEY ── */}
        <section className="lp-sec journey-bg">
          <div data-animate style={{ textAlign: "center" }}>
            <div className="sec-tag" style={{ justifyContent: "center" }}>Como funciona</div>
            <h2 className="sec-h2" style={{ textAlign: "center" }}>Sua jornada de <em>saúde</em></h2>
          </div>
          <div className="journey-grid">
            {JOURNEY.map((j, i) => (
              <div className="journey-item" key={i} data-animate style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="journey-num">{j.n}</div>
                <div className="journey-title">{j.title}</div>
                <p className="journey-desc">{j.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CONVENIOS ── */}
        <section className="lp-sec conv-bg" id="convenios">
          <div data-animate style={{ textAlign: "center" }}>
            <div className="sec-tag" style={{ justifyContent: "center" }}>Atendemos seu plano</div>
            <h2 className="sec-h2" style={{ textAlign: "center" }}>Convênios <em>aceitos</em></h2>
          </div>
          <div className="conv-strip" data-animate>
            {CONVENIOS.map((c) => (
              <div className="conv-pill" key={c}>{c}</div>
            ))}
          </div>
          <p className="conv-note">
            Não encontrou seu plano?{" "}
            <a href="#contato">Consulte nossa lista completa →</a>
          </p>
        </section>

        {/* ── SERVICES ── */}
        <section className="lp-sec svc-bg" id="servicos">
          <div data-animate>
            <div className="sec-tag">O que oferecemos</div>
            <h2 className="sec-h2">Especialidades <em>integradas</em><br />para seu cuidado</h2>
          </div>
          <div className="svc-grid">
            {SERVICES.map((s, i) => (
              <div className="svc-card" key={i} data-animate style={{ transitionDelay: `${i * 65}ms` }}>
                <span className="svc-icon">{s.icon}</span>
                <span className="svc-pill">{s.tag}</span>
                <div className="svc-title">{s.title}</div>
                <p className="svc-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="lp-sec faq-bg" id="faq">
          <div data-animate>
            <div className="sec-tag" style={{ color: "rgba(196,163,90,.75)" }}>Dúvidas frequentes</div>
            <h2 className="sec-h2 sec-h2-light">Perguntas <em>frequentes</em></h2>
          </div>
          <div className="faq-grid" style={{ marginTop: 52 }}>
            {FAQS.map((f, i) => (
              <div data-animate key={i} style={{ transitionDelay: `${i * 60}ms` }}>
                <FaqItem q={f.q} a={f.a} />
              </div>
            ))}
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section className="lp-sec tst-bg" id="depoimentos">
          <div data-animate>
            <div className="sec-tag">Depoimentos</div>
            <h2 className="sec-h2">O que nossos <em>pacientes</em> dizem</h2>
          </div>
          <div className="tst-grid">
            {TESTIMONIALS.map((t, i) => (
              <div className="tst-card" key={i} data-animate style={{ transitionDelay: `${i * 110}ms` }}>
                <div className="tst-stars">★★★★★</div>
                <p className="tst-q">&ldquo;{t.text}&rdquo;</p>
                <div className="tst-auth">
                  <div className="tst-av">{t.initials}</div>
                  <div><div className="tst-name">{t.name}</div><div className="tst-role">{t.role}</div></div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <div className="cta-bar" id="contato">
          <h2 className="cta-h" data-animate data-dir="left">
            Cuide da sua saúde<br />com quem entende.
          </h2>
          <div className="cta-actions" data-animate data-dir="right">
            <button className="btn-dark" onClick={() => setChatOpen(true)}>Agendar pelo chat</button>
            <a href="https://wa.me/5561999999999" target="_blank" rel="noopener noreferrer" className="btn-wa-cta">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.524 5.855L.057 23.25a.75.75 0 00.943.943l5.395-1.467A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.952 9.952 0 01-5.127-1.416l-.364-.216-3.204.871.872-3.203-.217-.365A9.951 9.951 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <div className="ft-top">
            <div>
              <div className="ft-logo">Lumina<span>.</span></div>
              <p className="ft-desc">Cuidado médico de excelência com abordagem integrativa e tecnologia de ponta para o seu bem-estar.</p>
              <div className="ft-badge">✦ ISO 9001 Certificada</div>
            </div>
            <div>
              <div className="ft-col-h">Especialidades</div>
              <ul className="ft-links">
                {["Medicina Preventiva","Medicina Estética","Nutrição Clínica","Saúde Mental","Medicina do Esporte"].map((s) => <li key={s}><a href="#">{s}</a></li>)}
              </ul>
            </div>
            <div>
              <div className="ft-col-h">Clínica</div>
              <ul className="ft-links">
                {["Sobre nós","Nossa equipe","Convênios","Blog de saúde","Trabalhe conosco"].map((s) => <li key={s}><a href="#">{s}</a></li>)}
              </ul>
            </div>
            <div>
              <div className="ft-col-h">Contato</div>
              <ul className="ft-links">
                <li><a href="#">(61) 9 9999-9999</a></li>
                <li><a href="#">contato@lumina.com.br</a></li>
                <li><a href="#">Asa Sul, Brasília — DF</a></li>
                <li><a href="#">Seg–Sex: 8h às 19h</a></li>
                <li><a href="#">Sáb: 8h às 13h</a></li>
              </ul>
            </div>
          </div>
          <div className="ft-bot">
            <span>© 2025 Clínica Lumina. Todos os direitos reservados.</span>
            <span>Agente de IA por <span className="ft-vello">VELLO Inteligência Artificial</span></span>
          </div>
        </footer>
      </div>

      {/* ── STICKY MOBILE CTA ── */}
      <div className="sticky-mobile" style={{ transform: showStickyMobile ? "translateY(0)" : "translateY(100%)" }}>
        <div className="sticky-mobile-inner">
          <button className="sticky-mobile-btn" onClick={() => setChatOpen(true)}>Agendar consulta</button>
          <a href="https://wa.me/5561999999999" className="sticky-mobile-wa" target="_blank" rel="noopener noreferrer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.524 5.855L.057 23.25a.75.75 0 00.943.943l5.395-1.467A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.952 9.952 0 01-5.127-1.416l-.364-.216-3.204.871.872-3.203-.217-.365A9.951 9.951 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            WhatsApp
          </a>
        </div>
      </div>

      {/* ── FLOATING ACTIONS ── */}
      <div className="float-actions">
        {chatOpen && (
          <div className="chat-win">
            <div className="chat-hd">
              <div className="chat-hd-av">🏥</div>
              <div style={{ flex: 1 }}>
                <div className="chat-hd-name">Assistente Lumina</div>
                <div className="chat-hd-st">Online agora</div>
              </div>
              <button className="chat-x" onClick={() => setChatOpen(false)}>×</button>
            </div>
            <div className="chat-msgs">
              {messages.map((m, i) => <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>)}
              {typing && <div className="chat-typing"><div className="typing-dots"><span /><span /><span /></div></div>}
              <div ref={msgEndRef} />
            </div>
            {messages.length <= 1 && (
              <div className="chat-sugg">
                {CHAT_SUGGESTIONS.map((s) => <button key={s} className="chat-sg" onClick={() => sendMessage(s)}>{s}</button>)}
              </div>
            )}
            <div className="chat-inp-row">
              <input className="chat-inp" placeholder="Digite sua mensagem..." value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage(input)} />
              <button className="chat-send" onClick={() => sendMessage(input)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
              </button>
            </div>
            <div className="chat-pw">Agente por <a href="https://velloia.com.br" target="_blank" rel="noopener noreferrer">VELLO Inteligência Artificial</a></div>
          </div>
        )}
        <a href="https://wa.me/5561999999999" className="wa-btn" target="_blank" rel="noopener noreferrer" title="WhatsApp">
          <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.524 5.855L.057 23.25a.75.75 0 00.943.943l5.395-1.467A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.952 9.952 0 01-5.127-1.416l-.364-.216-3.204.871.872-3.203-.217-.365A9.951 9.951 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        </a>
        <div className="chat-btn" onClick={() => setChatOpen((o) => !o)}>
          <span style={{ fontSize: "1.2rem" }}>{chatOpen ? "✕" : "💬"}</span>
          {!chatOpen && <span className="chat-notif">1</span>}
        </div>
      </div>
    </>
  );
}
