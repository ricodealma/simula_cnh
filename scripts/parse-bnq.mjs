// Converte o texto do "Banco Nacional de Questões - Versão 1.0" (Senatran)
// em data/questoes.json.
//
// Uso:
//   pdftotext -layout -enc UTF-8 bnq.pdf bnq.txt
//   node scripts/parse-bnq.mjs bnq.txt
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("Uso: node scripts/parse-bnq.mjs <bnq.txt>");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const HEADER = "CNH do Brasil - Ministério dos Transportes - Secretaria Nacional de Trânsito";
const MODULOS = {
  1: "Placas, Cores e Caminhos",
  2: "Escolhas e Consequências",
  3: "Na Direção da Segurança",
  4: "Cuidar, Agir e Preservar",
};

const lines = readFileSync(input, "utf8")
  .replace(/\f/g, "\n")
  .split(/\r?\n/)
  .filter((l) => l.trim() !== HEADER);

// O PDF traz alguns caracteres de controle soltos (ex.: \x19 no fim das respostas).
const clean = (s) => s.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "").replace(/\s+/g, " ").trim();

const questoes = [];
let parte = 0;
let modulo = 0;
let q = null;
let campo = null; // enunciado | correta | comentario | incorretas

function fechar() {
  if (!q) return;
  q.enunciado = clean(q.enunciado);
  q.correta = clean(q.correta);
  q.comentario = clean(q.comentario);
  q.incorretas = q.incorretas.map(clean).filter(Boolean);
  if (!q.correta || q.incorretas.length !== 3) {
    throw new Error(`Questão mal formada: ${q.id} -> ${JSON.stringify(q)}`);
  }
  questoes.push(q);
  q = null;
}

for (const raw of lines) {
  const line = raw.trim();
  let m;

  if ((m = line.match(/^PARTE (\d)/))) {
    fechar();
    parte = Number(m[1]);
    continue;
  }
  if ((m = line.match(/^MÓDULO (\d)/))) {
    fechar();
    modulo = Number(m[1]);
    continue;
  }
  if ((m = line.match(/^q \((Fácil|Intermediário|Difícil)\)\s+(\d+)\.\s*(.*)$/i))) {
    fechar();
    q = {
      id: `P${parte}M${modulo}-${m[2]}`,
      parte,
      modulo,
      numero: Number(m[2]),
      dificuldade: m[1],
      enunciado: m[3],
      placas: [],
      correta: "",
      comentario: "",
      incorretas: [],
    };
    campo = "enunciado";
    continue;
  }
  if (!q) continue;

  if ((m = line.match(/^Código da placa:\s*(.*)$/))) {
    q.placas = m[1].split(/\s+e\s+|,\s*/).map((s) => s.trim()).filter(Boolean);
    continue;
  }
  if ((m = line.match(/^Alternativa correta:\s*(.*)$/))) {
    q.correta = m[1];
    campo = "correta";
    continue;
  }
  if ((m = line.match(/^Comentário:\s*(.*)$/))) {
    q.comentario = m[1];
    campo = "comentario";
    continue;
  }
  if (/^Respostas incorretas:/.test(line)) {
    campo = "incorretas";
    continue;
  }
  if (!line) continue;

  if (campo === "incorretas") {
    if ((m = line.match(/^#\s*(.*)$/))) q.incorretas.push(m[1]);
    else if (q.incorretas.length) q.incorretas[q.incorretas.length - 1] += " " + line;
  } else {
    q[campo] += " " + line;
  }
}
fechar();

const porModulo = {};
for (const x of questoes) porModulo[x.modulo] = (porModulo[x.modulo] || 0) + 1;
console.log(`Total: ${questoes.length}`, porModulo);

const out = {
  fonte: "Banco Nacional de Questões - Versão 1.0 - CNH do Brasil - Secretaria Nacional de Trânsito (Senatran)",
  modulos: MODULOS,
  questoes,
};
writeFileSync(join(root, "data", "questoes.json"), JSON.stringify(out));
