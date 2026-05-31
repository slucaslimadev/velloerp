"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/* ─── data ─────────────────────────────────────────────────────── */
const SERVICES = [
  { emoji: "🩺", title: "Consultas & Diagnóstico", desc: "Avaliação clínica completa com exames laboratoriais, ultrassom e raio-x em um só lugar.", tag: "Clínica Geral" },
  { emoji: "💉", title: "Vacinas & Prevenção", desc: "Calendário vacinal completo para cães, gatos e pequenos animais. Carteirinha digital.", tag: "Preventivo" },
  { emoji: "⚕️", title: "Cirurgias", desc: "Centro cirúrgico equipado com monitoramento contínuo e anestesia inalatória segura.", tag: "Cirurgia" },
  { emoji: "🛁", title: "Banho & Tosa", desc: "Banho terapêutico, tosa higiênica e estética com produtos naturais e dermatológicos.", tag: "Estética Pet" },
  { emoji: "🚑", title: "Emergências 24h", desc: "Plantão de urgência todos os dias. Porque a saúde do seu pet não espera.", tag: "Urgência" },
  { emoji: "🦷", title: "Odontologia Veterinária", desc: "Limpeza dentária, extrações e tratamento de gengivite com equipamento odontológico específico.", tag: "Odonto" },
];

const TEAM = [
  { name: "Dra. Mariana Fonseca", role: "Clínica Geral & Cirurgia", crmv: "CRMV-DF 4.521", img: "/vet-team-1.jpg" },
  { name: "Dr. Bruno Castelo", role: "Dermatologia & Cardiologia", crmv: "CRMV-DF 5.832", img: "/vet-team-2.jpg" },
  { name: "Dra. Juliana Neves", role: "Oftalmologia & Oncologia", crmv: "CRMV-DF 6.109", img: "/vet-team-3.jpg" },
];

const PLANOS = [
  { nome: "Plano Filhote", preco: "R$ 89/mês", items: ["2 consultas/mês", "Vacinas inclusas", "Descontos em exames", "Suporte WhatsApp"] },
  { nome: "Plano Família", preco: "R$ 149/mês", items: ["Consultas ilimitadas", "Vacinas + vermífugos", "20% em cirurgias", "Emergência prioritária"], destaque: true },
  { nome: "Plano Senior", preco: "R$ 119/mês", items: ["Check-up trimestral", "Exames de rotina", "Acompanhamento geriátrico", "Medicação com desconto"] },
];

const CONVENIOS = ["Golden Cross Pet","Porto Seguro Pet","Allianz Pet","MetLife Pet","Prevent Senior Pet","SulAmérica Pet","Omint Pet"];

const FAQS = [
  { q: "A clínica atende qual tipo de animal?", a: "Atendemos cães, gatos, coelhos, hamsters, aves e répteis. Para animais exóticos, recomendamos agendar com antecedência para garantir o veterinário especializado." },
  { q: "Como funciona o plantão 24h?", a: "Nossa equipe de plantão atende emergências todos os dias, incluindo feriados. Para urgências fora do horário comercial, basta ligar ou mandar mensagem no WhatsApp que retornamos em até 5 minutos." },
  { q: "Preciso agendar para vacinas?", a: "Sim, recomendamos agendamento para garantir atendimento rápido e sem filas. A maioria das vacinações dura menos de 15 minutos. Aceitamos também encaixes de emergência." },
  { q: "Vocês fazem busca e entrega do pet?", a: "Sim! Temos serviço de transporte pet para consultas e banho & tosa dentro de um raio de 10km. Agende com pelo menos 24h de antecedência." },
  { q: "Os planos cobrem emergências?", a: "O Plano Família inclui atendimento de emergência prioritário sem custo adicional. Os demais planos têm desconto de 30% em urgências. Consulte os detalhes de cada plano." },
  { q: "Como recebo os resultados de exames?", a: "Os resultados são enviados por WhatsApp em até 24h para exames de rotina. Laudos mais complexos têm prazo de 48-72h. Você também pode acessar pelo nosso portal online." },
];

const TESTIMONIALS = [
  { name: "Camila Rodrigues", pet: "Tutora da Luna 🐕", text: "A equipe trata a Luna como se fosse filha deles. Já levei em outras clínicas mas aqui o nível de atenção e carinho é incomparável. Nunca mais vou a outro lugar.", initials: "CR" },
  { name: "Thiago Monteiro", pet: "Tutor do Bolinha e da Nina 🐈", text: "Dois gatos com necessidades bem diferentes e eles acompanham os dois com precisão e cuidado. Os laudos chegam no WhatsApp rapidinho. Recomendo demais.", initials: "TM" },
  { name: "Ana Paula Souza", pet: "Tutora do Rex 🐕", text: "O Rex precisou de cirurgia de emergência às 2h da manhã. A equipe estava lá, calma e profissional. Me salvaram a vida — e a dele. Gratidão eterna.", initials: "AS" },
];

const CHAT_SUGGESTIONS = ["Quero agendar uma consulta", "Preciso de atendimento de urgência", "Como funcionam os planos?"];
type Msg = { role: "user" | "assistant"; text: string };

/* ─── page ─────────────────────────────────────────────────────── */
export default function VetDemo() {
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: "Olá! 🐾 Sou a assistente virtual da Clínica PetVida. Como posso ajudar você e seu pet hoje?" }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const msgEnd = useRef<HTMLDivElement>(null);
  const [scrollY, setScrollY] = useState(0);
  const [scrollPct, setScrollPct] = useState(0);
  const rafRef = useRef<number>(0);

  const onScroll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setScrollY(window.scrollY);
      const t = document.documentElement.scrollHeight - window.innerHeight;
      setScrollPct((window.scrollY / t) * 100);
    });
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) e.target.classList.add("vis"); }),
      { threshold: 0.08 }
    );
    document.querySelectorAll("[data-a]").forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffect(() => { msgEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, typing]);

  const send = async (text: string) => {
    if (!text.trim() || typing) return;
    setMsgs((p) => [...p, { role: "user", text }]);
    setInput("");
    setTyping(true);
    await new Promise((r) => setTimeout(r, 1200));
    const l = text.toLowerCase();
    let reply = "Entendido! Nossa equipe pode ajudar melhor pessoalmente. Posso agendar um horário para você?";
    if (l.includes("agenda") || l.includes("consulta"))
      reply = "Que ótimo! Qual tipo de animal você tem? Temos horários disponíveis hoje para cães e gatos — manhã ou tarde?";
    else if (l.includes("urgência") || l.includes("emergência") || l.includes("urgencia"))
      reply = "Entendido! Nossa equipe de plantão está disponível agora. Me diga o que está acontecendo com seu pet e já direcionamos o atendimento. 🚨";
    else if (l.includes("plano") || l.includes("mensalidade"))
      reply = "Temos 3 planos: Filhote (R$89/mês), Família (R$149/mês) e Sênior (R$119/mês). Qual a idade do seu pet? Posso indicar o mais adequado!";
    else if (l.includes("vacina"))
      reply = "Trabalhamos com o calendário vacinal completo para cães e gatos. Qual a idade e espécie do seu pet? Vejo qual vacina está na hora certa. 💉";
    setMsgs((p) => [...p, { role: "assistant", text: reply }]);
    setTyping(false);
  };

  const navSolid = scrollY > 60;
  const heroOp = Math.max(0, 1 - scrollY / 500);
  const imgP = scrollY * 0.38;
  const txtP = scrollY * 0.18;
  const showSticky = scrollY > 500;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,300;1,9..144,400&family=DM+Sans:wght@300;400;500;600&display=swap');
        *{margin:0;padding:0;box-sizing:border-box;}
        :root{
          --cr:#FBF8F3;   /* cream */
          --wh:#FFFFFF;
          --tc:#C85A2A;   /* terracotta */
          --tcl:#E8834A;  /* light terra */
          --fo:#2D4A22;   /* forest */
          --fol:#3D6230;
          --am:#F0C070;   /* amber */
          --tx:#1A1A1A;
          --txm:#5C5347;
          --txl:#9E9387;
          --bd:rgba(45,74,34,0.1);
          --wa:#25D366;
          --r:16px;       /* border radius */
        }
        html{scroll-behavior:smooth;}
        .vp{font-family:'DM Sans',sans-serif;background:var(--cr);color:var(--tx);overflow-x:hidden;}

        /* PROGRESS */
        .prog{position:fixed;top:0;left:0;height:3px;background:linear-gradient(90deg,var(--tc),var(--am));z-index:200;pointer-events:none;border-radius:0 3px 3px 0;}

        /* NAV */
        .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:20px 60px;display:flex;align-items:center;justify-content:space-between;transition:all .35s;}
        .nav.solid{padding:14px 60px;background:rgba(251,248,243,.95);backdrop-filter:blur(20px);border-bottom:1px solid var(--bd);box-shadow:0 1px 20px rgba(0,0,0,.06);}
        .nav-logo{font-family:'Fraunces',serif;font-size:1.5rem;font-weight:500;color:#fff;letter-spacing:-.02em;transition:color .35s;display:flex;align-items:center;gap:8px;}
        .nav.solid .nav-logo{color:var(--fo);}
        .nav-logo-paw{font-size:1.2rem;}
        .nav-links{display:flex;gap:36px;list-style:none;}
        .nav-links a{font-size:.75rem;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.8);text-decoration:none;transition:color .2s;}
        .nav.solid .nav-links a{color:var(--txm);}
        .nav-links a:hover,.nav.solid .nav-links a:hover{color:var(--tc);}
        .nav-cta{background:var(--tc)!important;color:#fff!important;padding:9px 22px;border-radius:var(--r);}
        .nav-cta:hover{background:var(--tcl)!important;}

        /* HERO */
        .hero{position:relative;height:100vh;overflow:hidden;}
        .hero-img-wrap{position:absolute;inset:0;overflow:hidden;}
        .hero-img{width:100%;height:100%;object-fit:cover;display:block;}
        .hero-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
        .hero-ov{position:absolute;inset:0;background:linear-gradient(150deg,rgba(20,35,15,.6) 0%,rgba(20,35,15,.28) 45%,rgba(200,90,42,.22) 100%);pointer-events:none;}
        .hero-content{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 60px;}

        .hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(240,192,112,.15);border:1px solid rgba(240,192,112,.4);backdrop-filter:blur(10px);padding:8px 18px;border-radius:24px;font-size:.68rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--am);margin-bottom:24px;animation:fadeUp .7s ease .1s both;}
        .hero-badge-dot{width:7px;height:7px;border-radius:50%;background:#4ADE80;animation:blink 2s infinite;}
        @keyframes blink{0%,100%{opacity:1;}50%{opacity:.3;}}

        .hero-h1{font-family:'Fraunces',serif;font-size:clamp(3.2rem,6.5vw,6.5rem);font-weight:400;line-height:1.05;color:#fff;max-width:900px;animation:fadeUp .9s ease .3s both;letter-spacing:-.02em;}
        .hero-h1 em{font-style:italic;color:var(--am);}
        .hero-desc{font-size:1.05rem;font-weight:300;line-height:1.85;color:rgba(255,255,255,.75);max-width:520px;margin:22px auto 40px;animation:fadeUp .9s ease .5s both;}
        .hero-actions{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;animation:fadeUp .8s ease .65s both;}

        .btn-terra{background:var(--tc);color:#fff;padding:15px 36px;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border:none;cursor:pointer;transition:all .3s;border-radius:var(--r);display:inline-block;text-decoration:none;}
        .btn-terra:hover{background:var(--tcl);transform:translateY(-2px);box-shadow:0 8px 28px rgba(200,90,42,.4);}
        .btn-ghost-w{background:rgba(255,255,255,.12);color:#fff;padding:15px 36px;font-family:'DM Sans',sans-serif;font-size:.78rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border:1.5px solid rgba(255,255,255,.4);backdrop-filter:blur(8px);cursor:pointer;transition:all .3s;border-radius:var(--r);display:inline-block;text-decoration:none;}
        .btn-ghost-w:hover{background:rgba(255,255,255,.2);}

        .hero-stats{position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:center;background:rgba(20,35,15,.65);backdrop-filter:blur(16px);border-top:1px solid rgba(240,192,112,.2);animation:fadeUp .8s ease .8s both;}
        .hero-stat{flex:1;max-width:200px;padding:18px 24px;border-right:1px solid rgba(240,192,112,.15);text-align:center;}
        .hero-stat:last-child{border-right:none;}
        .hero-stat-n{font-family:'Fraunces',serif;font-size:1.9rem;font-weight:400;color:var(--am);line-height:1;}
        .hero-stat-l{font-size:.62rem;color:rgba(255,255,255,.45);letter-spacing:.08em;text-transform:uppercase;margin-top:4px;}

        .hero-scroll{position:absolute;bottom:88px;left:50%;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:8px;color:rgba(255,255,255,.35);font-size:.58rem;letter-spacing:.15em;text-transform:uppercase;animation:fadeIn 1s ease 1.1s both;}
        .scroll-line{width:1px;height:40px;background:linear-gradient(to bottom,rgba(255,255,255,.35),transparent);animation:scrollDrop 1.8s ease-in-out infinite;}
        @keyframes scrollDrop{0%{transform:scaleY(0);transform-origin:top;}50%{transform:scaleY(1);transform-origin:top;}51%{transform-origin:bottom;}100%{transform:scaleY(0);transform-origin:bottom;}}
        .hero-line{position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--tc),var(--am),var(--tc),transparent);}

        @keyframes fadeUp{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}
        @keyframes fadeIn{from{opacity:0;}to{opacity:1;}}

        /* ORGANIC WAVE */
        .wave{display:block;width:100%;overflow:hidden;line-height:0;margin-bottom:-2px;}
        .wave svg{display:block;width:100%;}

        /* SECTIONS */
        .sec{padding:96px 60px;}
        .sec-tag{font-size:.66rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--tc);display:flex;align-items:center;gap:10px;margin-bottom:18px;}
        .sec-tag::after{content:'';display:block;width:36px;height:1px;background:var(--tc);}
        .sec-h2{font-family:'Fraunces',serif;font-size:clamp(2.2rem,4vw,3.2rem);font-weight:400;line-height:1.2;color:var(--fo);letter-spacing:-.02em;}
        .sec-h2 em{font-style:italic;color:var(--tc);}
        .sec-h2-light{color:#FBF8F3;}
        .sec-h2-light em{color:var(--am);}

        /* SERVICES */
        .svc-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:52px;}
        .svc-card{background:var(--wh);padding:36px 32px;border-radius:20px;transition:all .4s;border:1.5px solid transparent;cursor:default;}
        .svc-card:hover{transform:translateY(-6px);box-shadow:0 20px 48px rgba(45,74,34,.12);border-color:rgba(200,90,42,.2);}
        .svc-emoji{font-size:2.4rem;display:block;margin-bottom:18px;line-height:1;font-style:normal;font-variant-emoji:text;}
        .svc-pill{font-size:.6rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;color:var(--tc);background:rgba(200,90,42,.08);border:1px solid rgba(200,90,42,.15);padding:4px 10px;border-radius:20px;display:inline-block;margin-bottom:12px;}
        .svc-title{font-family:'Fraunces',serif;font-size:1.35rem;font-weight:500;color:var(--fo);margin-bottom:10px;letter-spacing:-.01em;}
        .svc-desc{font-size:.875rem;line-height:1.75;color:var(--txm);}

        /* ABOUT / MISSION */
        .about-grid{display:grid;grid-template-columns:1fr 1fr;gap:72px;align-items:center;}
        .about-img-wrap{position:relative;border-radius:24px;overflow:hidden;aspect-ratio:4/5;background:linear-gradient(135deg,#e8d5c4 0%,#c9a882 100%);}
        .about-img-wrap img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .6s;position:absolute;inset:0;}
        .about-img-wrap:hover img{transform:scale(1.02);}
        .about-img-placeholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:5rem;opacity:.4;}
        .about-badge{position:absolute;bottom:-16px;right:-16px;background:var(--tc);color:#fff;padding:20px 24px;border-radius:16px;text-align:center;box-shadow:0 8px 32px rgba(200,90,42,.35);z-index:2;}
        .about-badge-n{font-family:'Fraunces',serif;font-size:2.2rem;font-weight:500;line-height:1;}
        .about-badge-t{font-size:.65rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.85;margin-top:4px;}
        .about-text{font-size:1rem;font-weight:300;line-height:1.9;color:var(--txm);margin:22px 0 32px;}
        .about-pills{display:flex;flex-wrap:wrap;gap:10px;}
        .about-pill{display:flex;align-items:center;gap:7px;padding:10px 16px;background:var(--wh);border:1.5px solid var(--bd);border-radius:24px;font-size:.8rem;font-weight:500;color:var(--fo);}
        .about-pill::before{content:'✓';color:var(--tc);font-weight:700;font-size:.75rem;}

        /* NUMBERS */
        .nums-bg{background:var(--fo);}
        .nums{display:grid;grid-template-columns:repeat(4,1fr);}
        .num-item{padding:48px 32px;text-align:center;border-right:1px solid rgba(255,255,255,.08);}
        .num-item:last-child{border-right:none;}
        .num-n{font-family:'Fraunces',serif;font-size:2.8rem;font-weight:400;color:var(--am);line-height:1;letter-spacing:-.02em;}
        .num-l{font-size:.68rem;font-weight:500;letter-spacing:.1em;text-transform:uppercase;color:rgba(251,248,243,.4);margin-top:10px;}

        /* TEAM */
        .team-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:52px;}
        .team-card{position:relative;overflow:hidden;border-radius:20px;background:var(--wh);}
        .team-card img{width:100%;aspect-ratio:3/4;object-fit:cover;object-position:top;display:block;transition:transform .5s;}
        .team-card:hover img{transform:scale(1.04);}
        .team-ov{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(to top,rgba(20,35,15,.92) 0%,rgba(20,35,15,.4) 55%,transparent 100%);padding:32px 24px 24px;transition:padding .3s;}
        .team-name{font-family:'Fraunces',serif;font-size:1.25rem;font-weight:500;color:#FBF8F3;margin-bottom:4px;letter-spacing:-.01em;}
        .team-role{font-size:.72rem;color:var(--am);font-weight:500;letter-spacing:.04em;margin-bottom:4px;}
        .team-crmv{font-size:.63rem;color:rgba(251,248,243,.4);letter-spacing:.06em;}
        .team-cta-btn{display:inline-flex;align-items:center;gap:5px;margin-top:12px;font-size:.68rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--am);border-bottom:1px solid rgba(240,192,112,.35);padding-bottom:2px;opacity:0;transform:translateY(6px);transition:all .3s;cursor:pointer;background:none;border-left:none;border-right:none;border-top:none;}
        .team-card:hover .team-cta-btn{opacity:1;transform:translateY(0);}

        /* PLANS */
        .plans-bg{background:var(--fo);}
        .plans-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:52px;}
        .plan-card{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.1);border-radius:20px;padding:36px 32px;transition:all .35s;}
        .plan-card.destaque{background:var(--tc);border-color:var(--tc);transform:scale(1.04);box-shadow:0 20px 60px rgba(200,90,42,.4);}
        .plan-card:not(.destaque):hover{background:rgba(255,255,255,.1);transform:translateY(-4px);}
        .plan-tag{font-size:.62rem;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:var(--am);margin-bottom:16px;}
        .plan-card.destaque .plan-tag{color:#fff;opacity:.8;}
        .plan-name{font-family:'Fraunces',serif;font-size:1.5rem;font-weight:500;color:#FBF8F3;margin-bottom:8px;letter-spacing:-.01em;}
        .plan-price{font-family:'Fraunces',serif;font-size:2.2rem;font-weight:400;color:var(--am);line-height:1;margin-bottom:24px;}
        .plan-card.destaque .plan-price{color:#fff;}
        .plan-items{list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:28px;}
        .plan-items li{font-size:.85rem;color:rgba(251,248,243,.8);display:flex;align-items:center;gap:8px;}
        .plan-items li::before{content:'🐾';font-size:.7rem;flex-shrink:0;}
        .btn-plan{width:100%;padding:14px;font-family:'DM Sans',sans-serif;font-size:.76rem;font-weight:600;letter-spacing:.08em;text-transform:uppercase;border:none;cursor:pointer;border-radius:12px;transition:all .3s;}
        .btn-plan-light{background:var(--cr);color:var(--fo);}
        .btn-plan-light:hover{background:#fff;}
        .btn-plan-dark{background:var(--fo);color:var(--cr);}
        .btn-plan-dark:hover{background:var(--fol);}

        /* CONVENIOS */
        .conv-strip{display:flex;flex-wrap:wrap;gap:10px;margin-top:36px;justify-content:center;}
        .conv-pill{display:inline-flex;align-items:center;gap:7px;padding:10px 18px;border:1.5px solid var(--bd);border-radius:24px;font-size:.8rem;font-weight:500;color:var(--fo);background:var(--wh);transition:all .25s;cursor:default;}
        .conv-pill::before{content:'🐾';font-size:.75rem;}
        .conv-pill:hover{border-color:var(--tc);box-shadow:0 4px 16px rgba(200,90,42,.1);}
        .conv-note{margin-top:20px;font-size:.82rem;color:var(--txl);text-align:center;}
        .conv-note a{color:var(--tc);font-weight:600;text-decoration:underline;text-underline-offset:3px;}

        /* FAQ */
        .faq-bg{background:var(--wh);}
        .faq-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px;margin-top:48px;}
        .faq-item{background:var(--cr);padding:22px 26px;cursor:pointer;transition:background .2s;border-radius:12px;margin:2px;}
        .faq-item.open,.faq-item:hover{background:#FFF6EE;}
        .faq-q{display:flex;justify-content:space-between;align-items:center;gap:12px;font-weight:500;font-size:.9rem;color:var(--fo);line-height:1.4;}
        .faq-ico{font-size:1.2rem;color:var(--tc);flex-shrink:0;transition:transform .3s;font-weight:300;font-family:'Fraunces',serif;}
        .faq-item.open .faq-ico{transform:rotate(45deg);}
        .faq-a{overflow:hidden;transition:max-height .35s ease;}
        .faq-a p{padding-top:12px;font-size:.84rem;line-height:1.8;color:var(--txm);font-weight:300;}

        /* TESTIMONIALS */
        .tst-bg{background:var(--cr);}
        .tst-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:52px;}
        .tst-card{background:var(--wh);border-radius:20px;padding:36px;border:1.5px solid transparent;transition:all .35s;}
        .tst-card:hover{border-color:rgba(200,90,42,.2);transform:translateY(-5px);box-shadow:0 16px 48px rgba(45,74,34,.1);}
        .tst-paw{font-size:1.5rem;margin-bottom:14px;display:block;}
        .tst-q{font-family:'Fraunces',serif;font-size:1.05rem;font-weight:300;font-style:italic;line-height:1.85;color:var(--txm);margin-bottom:22px;}
        .tst-auth{display:flex;align-items:center;gap:12px;}
        .tst-av{width:42px;height:42px;border-radius:50%;background:rgba(200,90,42,.1);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-size:.9rem;color:var(--tc);border:1.5px solid rgba(200,90,42,.2);}
        .tst-name{font-weight:600;font-size:.85rem;color:var(--fo);}
        .tst-pet{font-size:.72rem;color:var(--txl);margin-top:2px;}

        /* CTA */
        .cta-bar{background:linear-gradient(135deg,var(--tc) 0%,#A0441A 100%);padding:80px 60px;display:flex;align-items:center;justify-content:space-between;gap:40px;position:relative;overflow:hidden;}
        .cta-bar::before{content:'🐾';position:absolute;right:60px;top:30px;font-size:8rem;opacity:.06;pointer-events:none;}
        .cta-bar::after{content:'🐾';position:absolute;left:40px;bottom:20px;font-size:6rem;opacity:.05;pointer-events:none;transform:rotate(-20deg);}
        .cta-h{font-family:'Fraunces',serif;font-size:clamp(2rem,3.5vw,3rem);font-weight:400;color:#fff;line-height:1.2;position:relative;z-index:1;letter-spacing:-.02em;}
        .cta-h em{font-style:italic;color:var(--am);}
        .cta-btns{display:flex;gap:12px;flex-wrap:wrap;position:relative;z-index:1;}
        .btn-white{background:#fff;color:var(--tc);padding:17px 36px;font-family:'DM Sans',sans-serif;font-size:.76rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border:none;cursor:pointer;transition:all .3s;border-radius:var(--r);white-space:nowrap;}
        .btn-white:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(0,0,0,.2);}
        .btn-wa{background:var(--wa);color:#fff;padding:17px 36px;font-family:'DM Sans',sans-serif;font-size:.76rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;border:none;cursor:pointer;transition:all .3s;border-radius:var(--r);display:flex;align-items:center;gap:8px;white-space:nowrap;}
        .btn-wa:hover{filter:brightness(1.1);transform:translateY(-2px);}

        /* FOOTER */
        .footer{background:#1A2E14;color:rgba(251,248,243,.5);padding:64px 60px 40px;}
        .ft-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:60px;padding-bottom:48px;border-bottom:1px solid rgba(255,255,255,.07);}
        .ft-logo{font-family:'Fraunces',serif;font-size:1.6rem;color:#FBF8F3;margin-bottom:14px;display:flex;align-items:center;gap:8px;letter-spacing:-.02em;}
        .ft-logo span{color:var(--am);}
        .ft-desc{font-size:.82rem;line-height:1.85;max-width:280px;}
        .ft-badge{display:inline-flex;align-items:center;gap:6px;margin-top:16px;background:rgba(240,192,112,.1);border:1px solid rgba(240,192,112,.2);padding:6px 12px;border-radius:20px;font-size:.62rem;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--am);}
        .ft-col-h{font-size:.64rem;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:#FBF8F3;margin-bottom:20px;}
        .ft-links{list-style:none;display:flex;flex-direction:column;gap:12px;}
        .ft-links a{color:rgba(251,248,243,.5);text-decoration:none;font-size:.82rem;transition:color .2s;}
        .ft-links a:hover{color:var(--am);}
        .ft-bot{display:flex;justify-content:space-between;align-items:center;margin-top:32px;font-size:.72rem;}
        .ft-vello{color:var(--am);font-weight:600;}

        /* SCROLL REVEAL */
        [data-a]{opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s ease;}
        [data-a][data-d="l"]{transform:translateX(-28px);}
        [data-a][data-d="r"]{transform:translateX(28px);}
        [data-a][data-d="s"]{transform:scale(.95);}
        [data-a].vis{opacity:1;transform:none;}

        /* STICKY MOBILE */
        .sticky-mob{display:none;position:fixed;bottom:0;left:0;right:0;z-index:90;padding:12px 16px;background:var(--fo);border-top:2px solid var(--tc);box-shadow:0 -8px 32px rgba(0,0,0,.2);transition:transform .3s;}
        .sticky-mob-inner{display:flex;gap:10px;}
        .sticky-mob-btn{flex:1;background:var(--tc);color:#fff;border:none;padding:13px;font-family:'DM Sans',sans-serif;font-size:.74rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;border-radius:10px;}
        .sticky-mob-wa{flex:1;background:var(--wa);color:#fff;border:none;padding:13px;font-family:'DM Sans',sans-serif;font-size:.74rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:6px;}

        /* FLOAT ACTIONS */
        .float-acts{position:fixed;bottom:28px;right:28px;z-index:1000;display:flex;flex-direction:column;gap:12px;align-items:flex-end;}
        .wa-fab{width:50px;height:50px;background:var(--wa);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 24px rgba(37,211,102,.4);transition:all .3s;text-decoration:none;border:none;}
        .wa-fab:hover{transform:scale(1.1);}
        .wa-fab svg{width:22px;height:22px;fill:#fff;}
        .chat-fab{width:50px;height:50px;background:var(--tc);border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 28px rgba(200,90,42,.4);transition:all .3s;position:relative;border:2px solid var(--am);}
        .chat-fab::before{content:'';position:absolute;inset:-5px;border-radius:50%;border:1px solid rgba(240,192,112,.3);animation:fabRing 2.2s ease-in-out infinite;}
        @keyframes fabRing{0%,100%{transform:scale(1);opacity:.5;}50%{transform:scale(1.2);opacity:0;}}
        .chat-fab:hover{transform:scale(1.08);}
        .chat-notif{position:absolute;top:-3px;right:-3px;width:15px;height:15px;background:var(--fo);border-radius:50%;font-size:.55rem;font-weight:700;color:var(--am);display:flex;align-items:center;justify-content:center;}

        /* CHAT WINDOW */
        .chat-win{position:absolute;bottom:66px;right:0;width:360px;background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.15);overflow:hidden;display:flex;flex-direction:column;max-height:520px;animation:chatUp .3s cubic-bezier(.34,1.2,.64,1);}
        @keyframes chatUp{from{opacity:0;transform:translateY(14px) scale(.96);}to{opacity:1;transform:none;}}
        .chat-hd{background:var(--fo);padding:14px 18px;display:flex;align-items:center;gap:12px;}
        .chat-hd-av{width:36px;height:36px;background:rgba(240,192,112,.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.1rem;border:1.5px solid var(--am);flex-shrink:0;}
        .chat-hd-name{color:#FBF8F3;font-weight:600;font-size:.86rem;}
        .chat-hd-st{color:rgba(251,248,243,.5);font-size:.67rem;display:flex;align-items:center;gap:5px;margin-top:2px;}
        .chat-hd-st::before{content:'';display:inline-block;width:6px;height:6px;background:#4ADE80;border-radius:50%;animation:blink 2s infinite;}
        .chat-x{color:rgba(251,248,243,.5);background:none;border:none;cursor:pointer;font-size:1.3rem;margin-left:auto;padding:4px;transition:color .2s;}
        .chat-x:hover{color:#FBF8F3;}
        .chat-msgs{overflow-y:auto;padding:16px 12px;display:flex;flex-direction:column;gap:10px;min-height:240px;max-height:280px;background:#FAF8F4;}
        .chat-msg{max-width:86%;padding:10px 14px;border-radius:14px;font-size:.83rem;line-height:1.65;animation:msgIn .3s ease;}
        @keyframes msgIn{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:none;}}
        .chat-msg.assistant{background:#fff;color:var(--tx);border-bottom-left-radius:4px;box-shadow:0 1px 4px rgba(0,0,0,.06);align-self:flex-start;}
        .chat-msg.user{background:var(--tc);color:#fff;border-bottom-right-radius:4px;align-self:flex-end;}
        .chat-typing{background:#fff;padding:10px 14px;border-radius:14px;border-bottom-left-radius:4px;align-self:flex-start;box-shadow:0 1px 4px rgba(0,0,0,.06);}
        .typing-dots span{display:inline-block;width:6px;height:6px;background:var(--txl);border-radius:50%;margin:0 2px;animation:dot 1.2s infinite;}
        .typing-dots span:nth-child(2){animation-delay:.2s;}.typing-dots span:nth-child(3){animation-delay:.4s;}
        @keyframes dot{0%,60%,100%{transform:translateY(0);}30%{transform:translateY(-5px);}}
        .chat-sugg{padding:10px 12px;display:flex;flex-direction:column;gap:6px;border-top:1px solid rgba(0,0,0,.05);background:#fff;}
        .chat-sg{background:#FFF6EE;border:1.5px solid rgba(200,90,42,.15);color:var(--fo);padding:7px 12px;border-radius:20px;font-size:.75rem;cursor:pointer;transition:all .2s;text-align:left;font-family:'DM Sans',sans-serif;}
        .chat-sg:hover{background:var(--tc);color:#fff;border-color:var(--tc);}
        .chat-inp-row{padding:10px 12px;display:flex;gap:8px;border-top:1px solid rgba(0,0,0,.06);background:#fff;}
        .chat-inp{flex:1;border:1.5px solid rgba(200,90,42,.2);border-radius:20px;padding:9px 16px;font-family:'DM Sans',sans-serif;font-size:.83rem;color:var(--tx);background:#FFF9F5;outline:none;transition:border-color .2s;}
        .chat-inp:focus{border-color:var(--tc);}
        .chat-send{width:35px;height:35px;background:var(--tc);border:none;border-radius:50%;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;flex-shrink:0;}
        .chat-send:hover{background:var(--tcl);transform:scale(1.08);}
        .chat-pw{padding:6px 12px;text-align:center;font-size:.6rem;color:var(--txl);background:#fff;border-top:1px solid rgba(0,0,0,.04);}
        .chat-pw a{color:var(--tc);font-weight:600;text-decoration:none;}

        @media(max-width:900px){
          .nav{padding:14px 20px!important;}.nav-links{display:none;}
          .hero-content{padding:0 20px;}.hero-stats{display:none;}
          .sec{padding:64px 20px;}
          .about-grid{grid-template-columns:1fr;}.about-img-wrap{display:none;}
          .nums{grid-template-columns:1fr 1fr;}
          .svc-grid,.tst-grid{grid-template-columns:1fr;}
          .team-grid,.plans-grid{grid-template-columns:1fr;}
          .faq-grid{grid-template-columns:1fr;}
          .cta-bar{flex-direction:column;text-align:center;padding:56px 20px;}
          .ft-top{grid-template-columns:1fr 1fr;gap:28px;}
          .ft-bot{flex-direction:column;gap:8px;text-align:center;}
          .sticky-mob{display:block;}
          .float-acts{bottom:88px;}
          .chat-win{width:calc(100vw - 44px);right:-14px;}
        }
      `}</style>

      <div className="prog" style={{ width: `${scrollPct}%` }} />

      {/* NAV */}
      <nav className={`nav${navSolid ? " solid" : ""}`}>
        <div className="nav-logo">
          <span className="nav-logo-paw">🐾</span>
          PetVida
        </div>
        <ul className="nav-links">
          <li><a href="#servicos">Serviços</a></li>
          <li><a href="#equipe">Equipe</a></li>
          <li><a href="#planos">Planos</a></li>
          <li><a href="#faq">Dúvidas</a></li>
          <li><a href="#contato" className="nav-cta">Agendar</a></li>
        </ul>
      </nav>

      <div className="vp">

        {/* HERO */}
        <section className="hero">
          <div className="hero-img-wrap">
            <video
              className="hero-video"
              autoPlay
              muted
              loop
              playsInline
            >
              <source src="https://mfrawrvnaaqubhzihujf.supabase.co/storage/v1/object/public/demo-assets/vet-hero.mp4" type="video/mp4" />
            </video>
          </div>

          <div className="hero-ov" />

          <div className="hero-content">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              Plantão 24h disponível agora
            </div>
            <h1 className="hero-h1">
              Cuidado com <em>alma</em><br />para quem você ama.
            </h1>
            <p className="hero-desc">
              Medicina veterinária de excelência com carinho, tecnologia e uma equipe
              apaixonada pela saúde e bem-estar do seu pet.
            </p>
            <div className="hero-actions">
              <button className="btn-terra" onClick={() => setChatOpen(true)}>Agendar consulta</button>
              <a href="#planos" className="btn-ghost-w">Ver planos de saúde</a>
            </div>
          </div>

          <div className="hero-stats">
            {[
              { n: "8+", l: "Anos de experiência" },
              { n: "5.000+", l: "Pets atendidos" },
              { n: "24h", l: "Plantão de urgência" },
              { n: "★ 4.9", l: "Avaliação no Google" },
            ].map((s) => (
              <div className="hero-stat" key={s.l}>
                <div className="hero-stat-n">{s.n}</div>
                <div className="hero-stat-l">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="hero-scroll">
            <div className="scroll-line" /><span>Role para ver mais</span>
          </div>
          <div className="hero-line" />
        </section>

        {/* WAVE */}
        <div className="wave" style={{ background: "#FBF8F3" }}>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: 60 }}>
            <path d="M0,0 C240,60 480,60 720,30 C960,0 1200,60 1440,30 L1440,0 Z" fill="#1A2E14" />
          </svg>
        </div>

        {/* ABOUT */}
        <section className="sec" style={{ background: "#FBF8F3" }} id="sobre">
          <div className="about-grid">
            <div className="about-img-wrap" data-a data-d="l">
              <img
                src="/vet-about.jpg"
                alt="Golden retriever na clínica PetVida"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <div className="about-img-placeholder">🐾</div>
              <div className="about-badge">
                <div className="about-badge-n">8+</div>
                <div className="about-badge-t">anos<br />de história</div>
              </div>
            </div>
            <div data-a data-d="r" style={{ transitionDelay: "100ms" }}>
              <div className="sec-tag">Nossa missão</div>
              <h2 className="sec-h2">Onde <em>ciência</em> e<br />afeto se encontram</h2>
              <p className="about-text">
                A PetVida nasceu da convicção de que todo animal merece cuidado de excelência.
                Reunimos veterinários apaixonados, tecnologia de diagnóstico avançada e um
                ambiente acolhedor para cuidar do seu pet como ele merece.
              </p>
              <div className="about-pills">
                {["Anestesia inalatória", "Raio-X digital", "Ultrassom", "Laboratório in-house", "Internação 24h", "Transporte pet"].map((p) => (
                  <span className="about-pill" key={p}>{p}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* NUMBERS */}
        <div className="nums-bg">
          <div className="nums">
            {[
              { n: "98%", l: "Satisfação dos tutores" },
              { n: "30min", l: "Espera máxima" },
              { n: "12", l: "Especialidades" },
              { n: "CFMV", l: "Certificação federal" },
            ].map((item, i) => (
              <div className="num-item" key={i} data-a data-d="s" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="num-n">{item.n}</div>
                <div className="num-l">{item.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* WAVE */}
        <div className="wave" style={{ background: "#FBF8F3" }}>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: 60 }}>
            <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="#1A2E14" />
          </svg>
        </div>

        {/* SERVICES */}
        <section className="sec" style={{ background: "#FBF8F3" }} id="servicos">
          <div data-a>
            <div className="sec-tag">O que oferecemos</div>
            <h2 className="sec-h2">Tudo que seu pet<br />precisa em <em>um lugar</em></h2>
          </div>
          <div className="svc-grid">
            {SERVICES.map((s, i) => (
              <div className="svc-card" key={i} data-a style={{ transitionDelay: `${i * 65}ms` }}>
                <span className="svc-emoji">{s.emoji}</span>
                <span className="svc-pill">{s.tag}</span>
                <div className="svc-title">{s.title}</div>
                <p className="svc-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* TEAM */}
        <section className="sec" style={{ background: "#fff" }} id="equipe">
          <div data-a>
            <div className="sec-tag">Nossa equipe</div>
            <h2 className="sec-h2">Veterinários que <em>amam</em><br />o que fazem</h2>
          </div>
          <div className="team-grid">
            {TEAM.map((d, i) => (
              <div className="team-card" key={i} data-a style={{ transitionDelay: `${i * 90}ms` }}>
                <img src={d.img} alt={d.name} />
                <div className="team-ov">
                  <div className="team-name">{d.name}</div>
                  <div className="team-role">{d.role}</div>
                  <div className="team-crmv">{d.crmv}</div>
                  <button className="team-cta-btn" onClick={() => setChatOpen(true)}>
                    Agendar com ela →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PLANS */}
        <section className="sec plans-bg" id="planos">
          <div data-a>
            <div className="sec-tag" style={{ color: "rgba(240,192,112,.8)" }}>Planos de saúde pet</div>
            <h2 className="sec-h2 sec-h2-light">Cuide sem<br />se <em>preocupar</em></h2>
          </div>
          <div className="plans-grid">
            {PLANOS.map((p, i) => (
              <div className={`plan-card${p.destaque ? " destaque" : ""}`} key={i} data-a style={{ transitionDelay: `${i * 100}ms` }}>
                {p.destaque && <div className="plan-tag">⭐ Mais popular</div>}
                <div className="plan-name">{p.nome}</div>
                <div className="plan-price">{p.preco}</div>
                <ul className="plan-items">
                  {p.items.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <button
                  className={`btn-plan ${p.destaque ? "btn-plan-dark" : "btn-plan-light"}`}
                  onClick={() => setChatOpen(true)}
                >
                  Assinar plano
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* WAVE */}
        <div className="wave" style={{ background: "#FBF8F3" }}>
          <svg viewBox="0 0 1440 60" preserveAspectRatio="none" style={{ height: 60 }}>
            <path d="M0,60 C360,0 1080,0 1440,60 L1440,60 L0,60 Z" fill="#1A2E14" />
          </svg>
        </div>

        {/* CONVENIOS */}
        <section className="sec" style={{ background: "#FBF8F3" }} id="convenios">
          <div data-a style={{ textAlign: "center" }}>
            <div className="sec-tag" style={{ justifyContent: "center" }}>Convênios aceitos</div>
            <h2 className="sec-h2" style={{ textAlign: "center" }}>Planos <em>pet</em> aceitos</h2>
          </div>
          <div className="conv-strip" data-a>
            {CONVENIOS.map((c) => <div className="conv-pill" key={c}>{c}</div>)}
          </div>
          <p className="conv-note">Não encontrou seu plano? <a href="#contato">Consulte nossa lista completa →</a></p>
        </section>

        {/* FAQ */}
        <section className="sec faq-bg" id="faq">
          <div data-a>
            <div className="sec-tag">Dúvidas frequentes</div>
            <h2 className="sec-h2">Perguntas <em>frequentes</em></h2>
          </div>
          <div className="faq-grid" style={{ marginTop: 48 }}>
            {FAQS.map((f, i) => (
              <div
                key={i}
                className={`faq-item${openFaq === i ? " open" : ""}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                data-a
                style={{ transitionDelay: `${i * 55}ms` }}
              >
                <div className="faq-q">
                  <span>{f.q}</span>
                  <span className="faq-ico">{openFaq === i ? "−" : "+"}</span>
                </div>
                <div className="faq-a" style={{ maxHeight: openFaq === i ? 200 : 0 }}>
                  <p>{f.a}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="sec tst-bg" id="depoimentos">
          <div data-a>
            <div className="sec-tag">Depoimentos</div>
            <h2 className="sec-h2">O que os <em>tutores</em> falam</h2>
          </div>
          <div className="tst-grid">
            {TESTIMONIALS.map((t, i) => (
              <div className="tst-card" key={i} data-a style={{ transitionDelay: `${i * 110}ms` }}>
                <span className="tst-paw">🐾</span>
                <p className="tst-q">&ldquo;{t.text}&rdquo;</p>
                <div className="tst-auth">
                  <div className="tst-av">{t.initials}</div>
                  <div>
                    <div className="tst-name">{t.name}</div>
                    <div className="tst-pet">{t.pet}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="cta-bar" id="contato">
          <h2 className="cta-h" data-a data-d="l">
            Seu pet merece<br />o <em>melhor cuidado.</em>
          </h2>
          <div className="cta-btns" data-a data-d="r">
            <button className="btn-white" onClick={() => setChatOpen(true)}>Agendar consulta</button>
            <a href="https://wa.me/5561999999999" target="_blank" rel="noopener noreferrer" className="btn-wa">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.524 5.855L.057 23.25a.75.75 0 00.943.943l5.395-1.467A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.952 9.952 0 01-5.127-1.416l-.364-.216-3.204.871.872-3.203-.217-.365A9.951 9.951 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              WhatsApp
            </a>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="footer">
          <div className="ft-top">
            <div>
              <div className="ft-logo">🐾 PetVida<span>.</span></div>
              <p className="ft-desc">Medicina veterinária de excelência com carinho, tecnologia e uma equipe apaixonada pelo bem-estar animal.</p>
              <div className="ft-badge">✦ CFMV Certificada</div>
            </div>
            <div>
              <div className="ft-col-h">Serviços</div>
              <ul className="ft-links">
                {["Consultas","Vacinas","Cirurgias","Banho & Tosa","Emergências 24h"].map((s) => <li key={s}><a href="#">{s}</a></li>)}
              </ul>
            </div>
            <div>
              <div className="ft-col-h">Clínica</div>
              <ul className="ft-links">
                {["Sobre nós","Nossa equipe","Planos pet","Convênios","Trabalhe conosco"].map((s) => <li key={s}><a href="#">{s}</a></li>)}
              </ul>
            </div>
            <div>
              <div className="ft-col-h">Contato</div>
              <ul className="ft-links">
                <li><a href="#">(61) 9 9999-9999</a></li>
                <li><a href="#">oi@petvida.com.br</a></li>
                <li><a href="#">Asa Norte, Brasília — DF</a></li>
                <li><a href="#">Seg–Sex: 8h às 20h</a></li>
                <li><a href="#">Plantão: 24h/7dias</a></li>
              </ul>
            </div>
          </div>
          <div className="ft-bot">
            <span>© 2025 Clínica PetVida. Todos os direitos reservados.</span>
            <span>Site desenvolvido por <span className="ft-vello">VELLO Inteligência Artificial</span></span>
          </div>
        </footer>
      </div>

      {/* STICKY MOBILE */}
      <div className="sticky-mob" style={{ transform: showSticky ? "translateY(0)" : "translateY(100%)" }}>
        <div className="sticky-mob-inner">
          <button className="sticky-mob-btn" onClick={() => setChatOpen(true)}>Agendar agora</button>
          <a href="https://wa.me/5561999999999" className="sticky-mob-wa" target="_blank" rel="noopener noreferrer">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.524 5.855L.057 23.25a.75.75 0 00.943.943l5.395-1.467A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.952 9.952 0 01-5.127-1.416l-.364-.216-3.204.871.872-3.203-.217-.365A9.951 9.951 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            WhatsApp
          </a>
        </div>
      </div>

      {/* FLOATING ACTIONS */}
      <div className="float-acts">
        {chatOpen && (
          <div className="chat-win">
            <div className="chat-hd">
              <div className="chat-hd-av">🐾</div>
              <div style={{ flex: 1 }}>
                <div className="chat-hd-name">Assistente PetVida</div>
                <div className="chat-hd-st">Online agora</div>
              </div>
              <button className="chat-x" onClick={() => setChatOpen(false)}>×</button>
            </div>
            <div className="chat-msgs">
              {msgs.map((m, i) => <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>)}
              {typing && <div className="chat-typing"><div className="typing-dots"><span /><span /><span /></div></div>}
              <div ref={msgEnd} />
            </div>
            {msgs.length <= 1 && (
              <div className="chat-sugg">
                {CHAT_SUGGESTIONS.map((s) => <button key={s} className="chat-sg" onClick={() => send(s)}>{s}</button>)}
              </div>
            )}
            <div className="chat-inp-row">
              <input className="chat-inp" placeholder="Mensagem..." value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send(input)} />
              <button className="chat-send" onClick={() => send(input)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
              </button>
            </div>
            <div className="chat-pw">Agente por <a href="https://velloia.com.br" target="_blank" rel="noopener noreferrer">VELLO Inteligência Artificial</a></div>
          </div>
        )}
        <a href="https://wa.me/5561999999999" className="wa-fab" target="_blank" rel="noopener noreferrer">
          <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.554 4.122 1.524 5.855L.057 23.25a.75.75 0 00.943.943l5.395-1.467A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.952 9.952 0 01-5.127-1.416l-.364-.216-3.204.871.872-3.203-.217-.365A9.951 9.951 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        </a>
        <div className="chat-fab" onClick={() => setChatOpen((o) => !o)}>
          <span style={{ fontSize: "1.2rem" }}>{chatOpen ? "✕" : "💬"}</span>
          {!chatOpen && <span className="chat-notif">1</span>}
        </div>
      </div>
    </>
  );
}
