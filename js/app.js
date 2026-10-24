// Simulado da prova teórica do DETRAN-MG.
// Regras (Resolução CONTRAN nº 1.020/2025, arts. 31 a 34):
//   30 questões do Banco Nacional de Questões, 4 alternativas com 1 correta,
//   aprovação com no mínimo 20 acertos, duração mínima de 1 hora
//   (tempo em dobro para candidatos com dislexia, TDAH ou TEA).
const REGRAS = { questoes: 30, minimoAcertos: 20, minutos: 60 };
const QUESTOES_TREINO = 20;
const LETRAS = ["A", "B", "C", "D"];
const CHAVE_PROVA = "simula-cnh:prova";
const CHAVE_HISTORICO = "simula-cnh:historico";

const app = document.getElementById("app");
const relogio = document.getElementById("relogio");
const relogioValor = document.getElementById("relogio-valor");

let banco = null; // { modulos, questoes, porId }
let simulacao = null; // { materias: { chave: { nome, naProva, questoes: [ids] } } }
let materiaDe = {}; // id da questão -> chave da matéria (só questões do modo simulação)
let placas = {};
let prova = null;
let timer = null;
let filtroRevisao = "todas";

// ---------- utilidades ----------

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ler(chave, padrao) {
  try {
    const v = localStorage.getItem(chave);
    return v ? JSON.parse(v) : padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // Sem armazenamento (aba anônima etc.): o simulado funciona, só não é retomável.
  }
}

function formatarTempo(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// ---------- sorteio ----------

// Distribui as 30 questões entre os módulos proporcionalmente ao tamanho
// de cada módulo no banco (método dos maiores restos).
function cotasPorModulo(total) {
  const tamanhos = {};
  for (const q of banco.questoes) tamanhos[q.modulo] = (tamanhos[q.modulo] || 0) + 1;
  const n = banco.questoes.length;
  const cotas = Object.entries(tamanhos).map(([m, t]) => {
    const exata = (t * total) / n;
    return { m: Number(m), cota: Math.floor(exata), resto: exata % 1 };
  });
  let faltam = total - cotas.reduce((s, c) => s + c.cota, 0);
  for (const c of [...cotas].sort((a, b) => b.resto - a.resto)) {
    if (faltam-- <= 0) break;
    c.cota++;
  }
  return cotas;
}

// Sorteia questões sem repetir enunciados iguais (o banco tem algumas duplicadas).
function sortear(candidatas, quantidade, vistos = new Set()) {
  const escolhidas = [];
  for (const q of embaralhar(candidatas)) {
    if (escolhidas.length === quantidade) break;
    const chave = q.enunciado.toLowerCase();
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    escolhidas.push(q);
  }
  return escolhidas;
}

function montarQuestao(q) {
  const alternativas = embaralhar([q.correta, ...q.incorretas]);
  return { id: q.id, alternativas, certa: alternativas.indexOf(q.correta) };
}

// origem: "simulacao" (banco selecionado, sorteio por matéria como na prova)
//      ou "completo" (todas as questões, sorteio proporcional aos módulos).
function novaProva(tempoDobro, origem) {
  const vistos = new Set();
  let questoes = [];
  if (origem === "simulacao") {
    for (const m of Object.values(simulacao.materias)) {
      questoes.push(...sortear(m.questoes.map((id) => banco.porId[id]), m.naProva, vistos));
    }
  } else {
    for (const { m, cota } of cotasPorModulo(REGRAS.questoes)) {
      questoes.push(...sortear(banco.questoes.filter((q) => q.modulo === m), cota, vistos));
    }
  }
  questoes = embaralhar(questoes);
  const duracao = REGRAS.minutos * 60 * 1000 * (tempoDobro ? 2 : 1);
  return {
    tipo: "prova",
    origem,
    questoes: questoes.map(montarQuestao),
    respostas: Array(questoes.length).fill(null),
    atual: 0,
    inicio: Date.now(),
    prazo: Date.now() + duracao,
    duracao,
    finalizada: false,
  };
}

function novoTreino(modulo) {
  const questoes = sortear(banco.questoes.filter((q) => q.modulo === modulo), QUESTOES_TREINO);
  return {
    tipo: "treino",
    modulo,
    questoes: questoes.map(montarQuestao),
    respostas: Array(questoes.length).fill(null),
    atual: 0,
    inicio: Date.now(),
    finalizada: false,
  };
}

// ---------- relógio ----------

function pararRelogio() {
  clearInterval(timer);
  timer = null;
  relogio.hidden = true;
  relogio.classList.remove("alerta");
}

function iniciarRelogio() {
  pararRelogio();
  if (prova?.tipo !== "prova" || prova.finalizada) return;
  relogio.hidden = false;
  const tick = () => {
    const resta = prova.prazo - Date.now();
    relogioValor.textContent = formatarTempo(resta);
    relogio.classList.toggle("alerta", resta <= 5 * 60 * 1000);
    if (resta <= 0) finalizar(true);
  };
  tick();
  timer = setInterval(tick, 1000);
}

// ---------- telas ----------

function telaInicio() {
  pararRelogio();
  app.innerHTML = "";
  app.append(document.getElementById("tpl-inicio").content.cloneNode(true));

  app.querySelector("[data-total]").textContent = banco.questoes.length.toLocaleString("pt-BR");
  const materias = Object.values(simulacao.materias);
  app.querySelector("[data-total-sim]").textContent = materias
    .reduce((s, m) => s + m.questoes.length, 0)
    .toLocaleString("pt-BR");
  app.querySelector("[data-distribuicao-texto]").textContent = materias
    .map((m) => `${m.nome} (${m.naProva})`)
    .join(", ");
  app.querySelector("[data-distribuicao]").innerHTML = materias
    .map(
      (m) => `<li><span>${esc(m.nome)}</span><b>${m.naProva} questões</b>
        <span class="barra"><span style="width:${(m.naProva / REGRAS.questoes) * 100}%"></span></span></li>`
    )
    .join("");

  const dobro = app.querySelector("#tempo-dobro");
  const minutos = app.querySelector("[data-minutos]");
  dobro.addEventListener("change", () => {
    minutos.textContent = REGRAS.minutos * (dobro.checked ? 2 : 1);
  });

  const salva = ler(CHAVE_PROVA, null);
  if (salva && !salva.finalizada && salva.prazo > Date.now()) {
    app.querySelector('[data-acao="retomar"]').hidden = false;
  }

  const total = {};
  for (const q of banco.questoes) total[q.modulo] = (total[q.modulo] || 0) + 1;
  app.querySelector("[data-modulos]").innerHTML = Object.entries(banco.modulos)
    .map(
      ([n, nome]) => `
      <button class="btn modulo" data-acao="treino" data-modulo="${n}">
        <small>Módulo ${n}</small>
        <b>${esc(nome)}</b>
        <small>${total[n] || 0} questões</small>
      </button>`
    )
    .join("");

  const historico = ler(CHAVE_HISTORICO, []);
  if (historico.length) {
    app.querySelector("[data-historico]").hidden = false;
    app.querySelector("[data-historico-lista]").innerHTML = historico
      .map((h) => {
        const data = new Date(h.data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
        const ok = h.acertos >= REGRAS.minimoAcertos;
        const modo = h.origem === "completo" ? "Estudo (banco completo)" : "Simulação";
        return `<li>${data} · ${modo} — <span class="${ok ? "ok" : "bad"}">${h.acertos}/${h.total} ${ok ? "aprovado" : "reprovado"}</span> em ${formatarTempo(h.tempo)}</li>`;
      })
      .join("");
  }
  window.scrollTo(0, 0);
}

function htmlPlacas(q) {
  if (!q.placas.length) return "";
  const itens = q.placas
    .map((c) =>
      placas[c]
        ? `<figure class="placa"><img src="${esc(/^https?:/.test(placas[c]) ? placas[c] : "img/placas/" + placas[c])}" alt="Placa ${esc(c)}" loading="lazy"><figcaption>${esc(c)}</figcaption></figure>`
        : `<figure class="placa"><div class="placa-sem-imagem">Placa<br>${esc(c)}</div></figure>`
    )
    .join("");
  return `<div class="placas">${itens}</div>`;
}

function htmlGrade() {
  return prova.questoes
    .map((q, i) => {
      const cls = ["nav-q"];
      if (prova.respostas[i] !== null) {
        if (prova.tipo === "treino") cls.push(prova.respostas[i] === q.certa ? "certa" : "errada");
        else cls.push("respondida");
      }
      if (i === prova.atual) cls.push("atual");
      return `<button class="${cls.join(" ")}" data-acao="ir" data-i="${i}" aria-label="Questão ${i + 1}${prova.respostas[i] !== null ? ", respondida" : ""}">${i + 1}</button>`;
    })
    .join("");
}

function telaQuestao() {
  const i = prova.atual;
  const pq = prova.questoes[i];
  const q = banco.porId[pq.id];
  const resposta = prova.respostas[i];
  const treinoRespondida = prova.tipo === "treino" && resposta !== null;
  const respondidas = prova.respostas.filter((r) => r !== null).length;
  const ultima = i === prova.questoes.length - 1;

  const alternativas = pq.alternativas
    .map((texto, k) => {
      let cls = "alt";
      if (treinoRespondida) {
        if (k === pq.certa) cls += " certa";
        else if (k === resposta) cls += " errada";
      }
      return `<li><button class="${cls}" data-acao="responder" data-k="${k}" aria-pressed="${resposta === k}" ${treinoRespondida ? "disabled" : ""}>
        <span class="letra">${LETRAS[k]}</span><span>${esc(texto)}</span></button></li>`;
    })
    .join("");

  const titulo =
    prova.tipo === "treino"
      ? `Treino · Módulo ${prova.modulo} – ${esc(banco.modulos[prova.modulo])}`
      : prova.origem === "completo"
        ? "Estudo · banco completo"
        : "Simulação";
  const etiqueta = prova.origem === "simulacao" ? simulacao.materias[materiaDe[q.id]].nome : q.dificuldade;

  app.innerHTML = `
    <section class="cartao">
      <div class="progresso">
        <span>${titulo} · Questão <b>${i + 1}</b> de ${prova.questoes.length}</span>
        <span class="etiqueta">${esc(etiqueta)}</span>
      </div>
      <p class="enunciado">${esc(q.enunciado)}</p>
      ${htmlPlacas(q)}
      <ol class="alternativas">${alternativas}</ol>
      ${
        treinoRespondida
          ? `<div class="comentario" role="status"><p><b>${resposta === pq.certa ? "Correto!" : "Resposta errada."}</b> ${esc(q.comentario)}</p></div>`
          : ""
      }
      <div class="navegacao">
        <button class="btn" data-acao="anterior" ${i === 0 ? "disabled" : ""}>← Anterior</button>
        ${
          ultima
            ? `<button class="btn primario" data-acao="pedir-finalizar">Finalizar ${prova.tipo === "prova" ? "prova" : "treino"}</button>`
            : `<button class="btn primario" data-acao="proxima">Próxima →</button>`
        }
      </div>
    </section>

    <section class="cartao">
      <div class="progresso">
        <span>${respondidas} de ${prova.questoes.length} respondidas</span>
        <button class="btn perigo" data-acao="pedir-finalizar">Finalizar</button>
      </div>
      <nav class="grade" aria-label="Questões">${htmlGrade()}</nav>
    </section>`;
}

function corrigir() {
  return prova.questoes.reduce((s, q, i) => s + (prova.respostas[i] === q.certa ? 1 : 0), 0);
}

function telaResultado() {
  pararRelogio();
  const total = prova.questoes.length;
  const acertos = corrigir();
  const brancos = prova.respostas.filter((r) => r === null).length;
  const erros = total - acertos - brancos;
  const ehProva = prova.tipo === "prova";
  const minimo = ehProva ? REGRAS.minimoAcertos : Math.ceil((total * REGRAS.minimoAcertos) / REGRAS.questoes);
  const aprovado = acertos >= minimo;

  const itens = prova.questoes
    .map((pq, i) => {
      const q = banco.porId[pq.id];
      const r = prova.respostas[i];
      const certo = r === pq.certa;
      if (filtroRevisao === "erros" && certo) return "";
      if (filtroRevisao === "acertos" && !certo) return "";
      const alts = pq.alternativas
        .map((t, k) => {
          let cls = "alt";
          if (k === pq.certa) cls += " certa";
          else if (k === r) cls += " errada";
          return `<li><button class="${cls}" disabled><span class="letra">${LETRAS[k]}</span><span>${esc(t)}</span></button></li>`;
        })
        .join("");
      const origem = prova.origem === "simulacao" ? simulacao.materias[materiaDe[q.id]].nome : `Módulo ${q.modulo}`;
      return `<li>
        <div class="cab">
          <span>Questão ${i + 1} · ${esc(origem)} · ${esc(q.dificuldade)}</span>
          <span class="${certo ? "status-ok" : "status-bad"}">${certo ? "Acertou" : r === null ? "Em branco" : "Errou"}</span>
        </div>
        <p class="enunciado">${esc(q.enunciado)}</p>
        ${htmlPlacas(q)}
        <ol class="alternativas">${alts}</ol>
        <div class="comentario"><p>${esc(q.comentario)}</p></div>
      </li>`;
    })
    .join("");

  // Desempenho por matéria (modo simulação).
  let desempenho = "";
  if (prova.origem === "simulacao") {
    const porMateria = {};
    prova.questoes.forEach((pq, i) => {
      const m = (porMateria[materiaDe[pq.id]] ??= { total: 0, acertos: 0 });
      m.total++;
      if (prova.respostas[i] === pq.certa) m.acertos++;
    });
    desempenho = `<ul class="distribuicao desempenho">${Object.entries(simulacao.materias)
      .filter(([k]) => porMateria[k])
      .map(([k, info]) => {
        const { total, acertos } = porMateria[k];
        const pct = (acertos / total) * 100;
        return `<li><span>${esc(info.nome)}</span><b>${acertos}/${total}</b>
          <span class="barra ${pct >= (REGRAS.minimoAcertos / REGRAS.questoes) * 100 ? "ok" : "bad"}"><span style="width:${pct}%"></span></span></li>`;
      })
      .join("")}</ul>`;
  }

  const filtro = (valor, rotulo) =>
    `<button class="btn" data-acao="filtrar" data-filtro="${valor}" aria-pressed="${filtroRevisao === valor}">${rotulo}</button>`;

  app.innerHTML = `
    <section class="cartao resultado ${aprovado ? "aprovado" : "reprovado"}">
      <span class="selo">${aprovado ? "Aprovado" : "Reprovado"}</span>
      <div class="placar">${acertos}<small>/${total}</small></div>
      <p class="sub">${
        ehProva
          ? `Mínimo para aprovação: ${REGRAS.minimoAcertos} acertos.${prova.esgotado ? " O tempo acabou e a prova foi encerrada automaticamente." : ""}`
          : `Referência: ${minimo} acertos (mesma proporção da prova).`
      }</p>
      <div class="resumo">
        <span>✔ ${acertos} acertos</span>
        <span>✘ ${erros} erros</span>
        ${brancos ? `<span>○ ${brancos} em branco</span>` : ""}
        <span>⏱ ${formatarTempo(prova.tempo)}</span>
      </div>
      ${desempenho}
      <div class="acoes">
        <button class="btn primario" data-acao="${ehProva ? "iniciar-prova" : "treino"}" ${ehProva ? `data-banco="${prova.origem}"` : `data-modulo="${prova.modulo}"`}>
          ${ehProva ? (prova.origem === "simulacao" ? "Nova simulação" : "Nova prova") : "Treinar de novo"}
        </button>
        <button class="btn" data-acao="inicio">Início</button>
      </div>
    </section>

    <section class="cartao">
      <h2>Correção</h2>
      <div class="filtros">${filtro("todas", "Todas")}${filtro("erros", "Só erros")}${filtro("acertos", "Só acertos")}</div>
      <ol class="revisao">${itens || '<li class="sub">Nenhuma questão neste filtro.</li>'}</ol>
    </section>`;
}

function render() {
  if (!prova) return telaInicio();
  if (prova.finalizada) return telaResultado();
  telaQuestao();
}

// ---------- ações ----------

function salvar() {
  if (prova?.tipo === "prova") gravar(CHAVE_PROVA, prova.finalizada ? null : prova);
}

function finalizar(esgotado = false) {
  if (!prova || prova.finalizada) return;
  prova.finalizada = true;
  prova.esgotado = esgotado;
  prova.tempo = Math.min(Date.now() - prova.inicio, prova.duracao ?? Infinity);
  filtroRevisao = "todas";
  if (prova.tipo === "prova") {
    const historico = ler(CHAVE_HISTORICO, []);
    historico.unshift({
      data: Date.now(),
      origem: prova.origem,
      acertos: corrigir(),
      total: prova.questoes.length,
      tempo: prova.tempo,
    });
    gravar(CHAVE_HISTORICO, historico.slice(0, 10));
  }
  salvar();
  document.querySelector("dialog[open]")?.close();
  render();
  window.scrollTo(0, 0);
}

function confirmarFinalizar() {
  const brancos = prova.respostas.filter((r) => r === null).length;
  document.querySelectorAll("dialog").forEach((d) => d.remove());
  const dlg = document.createElement("dialog");
  dlg.innerHTML = `
    <h2>Finalizar ${prova.tipo === "prova" ? "a prova" : "o treino"}?</h2>
    <p>${
      brancos
        ? `Você ainda tem <b>${brancos}</b> ${brancos === 1 ? "questão" : "questões"} sem resposta. Questões em branco contam como erro.`
        : "Todas as questões foram respondidas."
    }</p>
    <div class="acoes">
      <button class="btn" value="nao">Voltar</button>
      <button class="btn primario" value="sim">Finalizar</button>
    </div>`;
  dlg.addEventListener("click", (e) => {
    const v = e.target.closest("button")?.value;
    if (!v) return;
    dlg.close();
    dlg.remove();
    if (v === "sim") finalizar();
  });
  dlg.addEventListener("cancel", () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
}

function responder(k) {
  if (!prova || prova.finalizada) return;
  if (prova.tipo === "treino" && prova.respostas[prova.atual] !== null) return;
  prova.respostas[prova.atual] = k;
  salvar();
  render();
}

function irPara(i) {
  if (!prova || i < 0 || i >= prova.questoes.length) return;
  prova.atual = i;
  salvar();
  render();
  app.querySelector(".enunciado")?.scrollIntoView({ block: "nearest" });
}

app.addEventListener("click", (e) => {
  const alvo = e.target.closest("[data-acao]");
  if (!alvo || alvo.disabled) return;
  const acao = alvo.dataset.acao;

  if (acao === "iniciar-prova") {
    const dobro = app.querySelector("#tempo-dobro")?.checked ?? prova?.duracao > REGRAS.minutos * 60000;
    prova = novaProva(dobro, alvo.dataset.banco || "simulacao");
    salvar();
    render();
    iniciarRelogio();
  } else if (acao === "retomar") {
    prova = ler(CHAVE_PROVA, null);
    prova.origem ??= "completo"; // provas salvas antes de existir o modo simulação
    render();
    iniciarRelogio();
  } else if (acao === "treino") {
    prova = novoTreino(Number(alvo.dataset.modulo));
    render();
  } else if (acao === "responder") responder(Number(alvo.dataset.k));
  else if (acao === "anterior") irPara(prova.atual - 1);
  else if (acao === "proxima") irPara(prova.atual + 1);
  else if (acao === "ir") irPara(Number(alvo.dataset.i));
  else if (acao === "pedir-finalizar") confirmarFinalizar();
  else if (acao === "filtrar") {
    filtroRevisao = alvo.dataset.filtro;
    render();
  } else if (acao === "inicio") {
    e.preventDefault();
    sairParaInicio();
  }
});

// Se a imagem da placa não carregar, mostra só o código.
app.addEventListener(
  "error",
  (e) => {
    const img = e.target;
    if (img.tagName !== "IMG" || !img.closest(".placa")) return;
    const box = document.createElement("div");
    box.className = "placa-sem-imagem";
    box.innerHTML = `Placa<br>${esc(img.alt.replace(/^Placa /, ""))}`;
    img.replaceWith(box);
  },
  true
);

document.querySelector('.marca').addEventListener("click", (e) => {
  e.preventDefault();
  sairParaInicio();
});

// A prova em andamento continua salva e pode ser retomada pela tela inicial.
function sairParaInicio() {
  prova = null;
  render();
}

document.addEventListener("keydown", (e) => {
  if (!prova || prova.finalizada || document.querySelector("dialog[open]")) return;
  if (e.altKey || e.ctrlKey || e.metaKey) return;
  const k = "1234".indexOf(e.key) >= 0 ? "1234".indexOf(e.key) : "abcd".indexOf(e.key.toLowerCase());
  if (k >= 0 && e.key.length === 1) responder(k);
  else if (e.key === "ArrowRight") irPara(prova.atual + 1);
  else if (e.key === "ArrowLeft") irPara(prova.atual - 1);
});

// ---------- carga ----------

async function carregar() {
  try {
    const [dados, sim, mapa] = await Promise.all([
      fetch("data/questoes.json").then((r) => r.json()),
      fetch("data/simulacao.json").then((r) => r.json()),
      fetch("data/placas.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({})),
    ]);
    banco = { ...dados, porId: Object.fromEntries(dados.questoes.map((q) => [q.id, q])) };
    simulacao = sim;
    materiaDe = {};
    for (const [k, m] of Object.entries(sim.materias)) for (const id of m.questoes) materiaDe[id] = k;
    placas = mapa;
    render();
  } catch (err) {
    app.innerHTML = `<section class="cartao"><h2>Não foi possível carregar as questões.</h2><p class="sub">${esc(err.message)}</p></section>`;
  }
}

carregar();
