// O PDF do Banco Nacional de Questões cita apenas o código das placas
// (ex.: "Código da placa: A-33a"). Este script baixa os desenhos
// correspondentes do Wikimedia Commons ("File:Brasil <código>.svg")
// para img/placas/ e grava a lista do que foi encontrado em data/placas.json.
//
// Uso: node scripts/baixar-placas.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const UA = "simula-cnh/1.0 (simulador educacional de prova teorica)";
const { questoes } = JSON.parse(readFileSync(join(root, "data", "questoes.json"), "utf8"));
const codigos = [...new Set(questoes.flatMap((q) => q.placas))].sort();
const dir = join(root, "img", "placas");
mkdirSync(dir, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// O Commons limita requisições; tenta de novo com espera crescente.
async function get(url, tentativas = 6) {
  for (let i = 0; i < tentativas; i++) {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res;
    await sleep(3000 * 2 ** Math.min(i, 3));
  }
  throw new Error("Falha ao baixar " + url);
}

// Nomes usados no Commons para os códigos (ex.: "SAU-06" aparece como "SAU-06" ou "SAU-6").
const candidatos = (c) => [...new Set([`Brasil ${c}.svg`, `Brasil ${c.replace(/-0(\d)/, "-$1")}.svg`])];

// Consulta até 50 títulos por requisição.
const titulos = codigos.flatMap(candidatos);
const urls = {};
for (let i = 0; i < titulos.length; i += 50) {
  const lote = titulos.slice(i, i + 50).map((t) => "File:" + t);
  const api =
    "https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&titles=" +
    encodeURIComponent(lote.join("|"));
  const data = await (await get(api)).json();
  const norm = Object.fromEntries((data.query.normalized || []).map((n) => [n.to, n.from]));
  for (const p of Object.values(data.query.pages)) {
    if (p.missing === undefined) urls[norm[p.title] || p.title] = p.imageinfo[0].url;
  }
  await sleep(1000);
}

// Valor no placas.json: nome do arquivo local ou, se o download falhar
// (limite de requisições do Commons), a URL remota da imagem.
const encontrados = {};
const faltando = [];
const remotas = [];
for (const c of codigos) {
  const arquivo = `${c}.svg`;
  const url = candidatos(c).map((t) => urls["File:" + t]).find(Boolean);
  if (!existsSync(join(dir, arquivo))) {
    if (!url) {
      faltando.push(c);
      continue;
    }
    try {
      const svg = await (await get(url, 2)).text();
      if (!svg.includes("<svg")) throw new Error("Resposta não é SVG");
      writeFileSync(join(dir, arquivo), svg);
      console.log("ok", c);
      await sleep(1500);
    } catch {
      encontrados[c] = url.split("?")[0];
      remotas.push(c);
      continue;
    }
  }
  encontrados[c] = arquivo;
}
if (remotas.length) console.log(`Usando URL remota (rode de novo mais tarde para baixar): ${remotas.join(", ")}`);

writeFileSync(join(root, "data", "placas.json"), JSON.stringify(encontrados, null, 1));
console.log(`\n${Object.keys(encontrados).length}/${codigos.length} placas. Sem imagem: ${faltando.join(", ") || "nenhuma"}`);
