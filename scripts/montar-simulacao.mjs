// Monta o banco do modo simulação (data/simulacao.json) a partir de
// data/questoes.json.
//
// A prova clássica do DETRAN divide as 30 questões em 5 matérias
// (Legislação 12, Direção Defensiva 10, Primeiros Socorros 3,
// Meio Ambiente e Cidadania 3, Mecânica Básica 2). Os módulos do Banco
// Nacional de Questões misturam essas matérias, então cada questão é
// classificada por palavras-chave. Depois, um subconjunto menor e mais
// "cara de prova" é escolhido por matéria:
//   - sem enunciados repetidos;
//   - sem questões que dependem de uma placa sem imagem;
//   - prioridade para questões com base legal citada (CTB, resoluções),
//     dificuldade intermediária/difícil e as da "Parte 2 - Teste seus
//     conhecimentos", que o próprio banco apresenta como questões de teste.
//
// Uso: node scripts/montar-simulacao.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const { questoes } = JSON.parse(readFileSync(join(root, "data", "questoes.json"), "utf8"));
const placas = JSON.parse(readFileSync(join(root, "data", "placas.json"), "utf8"));

const MATERIAS = {
  legislacao: { nome: "Legislação de Trânsito", naProva: 12, noBanco: 240 },
  defensiva: { nome: "Direção Defensiva", naProva: 10, noBanco: 200 },
  socorros: { nome: "Primeiros Socorros", naProva: 3, noBanco: 60 },
  ambiente: { nome: "Meio Ambiente e Cidadania", naProva: 3, noBanco: 60 },
  mecanica: { nome: "Mecânica Básica", naProva: 2, noBanco: 40 },
};

const RE = {
  // Termos que, no enunciado, já indicam norma/processo de habilitação.
  normas:
    /infra[çc]|multa|\bacc\b|penalidade|pontos|cassa[çc]|suspens[ãa]o do direito|\bcnh\b|habilita[çc]|permiss[ãa]o para dirigir|baf[ôo]metro|etil[ôo]metro|categoria|licenciamento|crlv|ciclomotor|acostamento|via de tr[âa]nsito r[áa]pido|placa|sinaliza|sem[áa]foro|prefer[êe]ncia|ultrapass|estacion|velocidade m[áa]xima|cargas? perigosa|\bctb\b|c[óo]digo de tr[âa]nsito/,
  socorros:
    /primeiros socorros|v[íi]tima|ferid|socorr|samu|\b192\b|\b193\b|hemorrag|sangra|fratura|queimadura|desmai|inconscien|parada card|rcp|massagem card|imobiliz|engasg|convuls/,
  ambiente:
    /meio ambiente|ambiental|polui|emiss|gases|descarte|res[íi]duo|recicl|sonora|catalisador|aquecimento global|sustent|cidadania|cidad[ãa]o|convív|conviv[êe]ncia|cortesia|gentileza|solidari|[ée]tica|boa conduta|inclus[ãa]o/,
  mecanica:
    /motor\b|[óo]leo|lubrifica|arrefecimento|radiador|bateria|pneu|calibr|sulco|pastilha|fluido de freio|disco de freio|freios?\b.*(ru[íi]do|desgast|revis)|embreagem|c[âa]mbio|amortecedor|alinhamento|balanceamento|correia|velas? de igni|alternador|painel|palheta|limpador de para|l[âa]mpada|filtro de|escapamento|manuten[çc][ãa]o|revis[ãa]o|recall|manual do propriet|superaquec/,
  legislacao:
    /\bart\.|artigo|resolu[çc][ãa]o|contran|documento|faixa de pedestre|parada|rotat[óo]ria|agente de tr[âa]nsito|via (arterial|coletora|local)|rodovia|marcas? vi[áa]ria|gesto|apito/,
};

function classificar(q) {
  const texto = `${q.enunciado} ${q.correta}`.toLowerCase();
  const tudo = `${texto} ${q.comentario}`.toLowerCase();
  if (q.placas.length || RE.normas.test(q.enunciado.toLowerCase())) return "legislacao";
  if (/dire[çc][ãa]o defensiva/.test(q.enunciado.toLowerCase())) return "defensiva";
  if (RE.socorros.test(texto)) return "socorros";
  if (RE.ambiente.test(texto)) return "ambiente";
  if (RE.mecanica.test(texto)) return "mecanica";
  if (RE.normas.test(texto) || RE.legislacao.test(tudo)) return "legislacao";
  // Sem pista clara: módulos 1 e 2 tratam de sinalização, normas e infrações;
  // os módulos 3 e 4, de condução segura e comportamento.
  return q.modulo <= 2 ? "legislacao" : "defensiva";
}

// A placa existe para o aluno ver? (questões do tipo "o que indica a placa acima?")
const placaVisivel = (q) => q.placas.every((c) => placas[c]);

function pontuacao(q) {
  let p = 0;
  if (/\bart\.|artigo|\bctb\b|resolu[çc][ãa]o/i.test(q.comentario)) p += 3;
  if (q.dificuldade === "Intermediário") p += 1;
  if (q.dificuldade === "Difícil") p += 2;
  if (q.parte === 2) p += 2;
  if (q.placas.length) p += 1;
  return p;
}

const porMateria = Object.fromEntries(Object.keys(MATERIAS).map((m) => [m, []]));
const vistos = new Set();
for (const q of questoes) {
  const chave = q.enunciado.toLowerCase().replace(/\W+/g, " ").trim();
  if (vistos.has(chave) || !placaVisivel(q)) continue;
  vistos.add(chave);
  porMateria[classificar(q)].push(q);
}

const saida = {};
for (const [m, info] of Object.entries(MATERIAS)) {
  // Ordem estável: maior pontuação primeiro, desempate pela ordem do banco.
  const escolhidas = porMateria[m]
    .map((q, i) => ({ q, i, p: pontuacao(q) }))
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .slice(0, info.noBanco)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.q.id);
  saida[m] = { nome: info.nome, naProva: info.naProva, questoes: escolhidas };
  console.log(`${info.nome}: ${porMateria[m].length} classificadas, ${escolhidas.length} no banco da simulação`);
}

writeFileSync(join(root, "data", "simulacao.json"), JSON.stringify({ materias: saida }, null, 1));
