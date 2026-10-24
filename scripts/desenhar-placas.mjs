// Desenha as placas citadas no Banco Nacional de Questões que não existem no
// Wikimedia Commons (serviços auxiliares, turismo, acessibilidade e algumas
// de regulamentação/advertência). São pictogramas simplificados, no padrão de
// cores do Manual Brasileiro de Sinalização de Trânsito.
//
// Uso: node scripts/desenhar-placas.mjs   (depois rode baixar-placas.mjs)
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "img", "placas");
mkdirSync(dir, { recursive: true });

const AZUL = "#0b4ea2";
const MARROM = "#7b4a21";
const VERDE = "#00703c";
const VERMELHO = "#c8102e";

const svg = (corpo) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${corpo}</svg>\n`;

// Serviços auxiliares: placa colorida com quadro branco e pictograma preto.
const servico = (pict, fundo = AZUL) =>
  svg(
    `<rect x="2" y="2" width="96" height="96" rx="8" fill="${fundo}" stroke="#fff" stroke-width="2"/>` +
      `<rect x="14" y="14" width="72" height="72" rx="3" fill="#fff"/>` +
      `<g fill="#111" stroke="#111">${pict}</g>`
  );

// Atrativos turísticos: placa marrom com pictograma branco.
const turismo = (pict) =>
  svg(
    `<rect x="2" y="2" width="96" height="96" rx="8" fill="${MARROM}" stroke="#fff" stroke-width="2"/>` +
      `<rect x="7" y="7" width="86" height="86" rx="5" fill="none" stroke="#fff" stroke-width="2"/>` +
      `<g fill="#fff" stroke="#fff">${pict}</g>`
  );

// Regulamentação: círculo branco com borda vermelha.
const regulamentacao = (pict) =>
  svg(
    `<circle cx="50" cy="50" r="45" fill="#fff" stroke="${VERMELHO}" stroke-width="9"/>` +
      `<g fill="#111" stroke="#111">${pict}</g>`
  );

const pedestre = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})" stroke-width="5" stroke-linecap="round" fill="none">` +
  `<circle cx="0" cy="-20" r="5" fill="#111" stroke="none"/>` +
  `<path d="M0 -12 L-1 6 M-1 6 L-8 22 M-1 6 L7 22 M0 -8 L-9 2 M0 -8 L9 0"/></g>`;

const bicicleta = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">` +
  `<circle cx="-12" cy="8" r="9"/><circle cx="12" cy="8" r="9"/>` +
  `<path d="M-12 8 L-3 -6 L9 -6 L0 8 Z M9 -6 L12 8 M-3 -6 L-5 -11 M-8 -11 L-1 -11 M9 -6 L7 -12 L12 -12"/></g>`;

const placas = {
  // Telefone
  "SAU-06": servico(
    `<path d="M24 40 Q50 22 76 40 L72 49 L62 49 L60 42 Q50 38 40 42 L38 49 L28 49 Z" stroke="none"/>` +
      `<path d="M34 50 H66 L72 74 H28 Z" stroke="none"/>` +
      `<g fill="#fff" stroke="none"><circle cx="42" cy="58" r="2.5"/><circle cx="50" cy="58" r="2.5"/><circle cx="58" cy="58" r="2.5"/>` +
      `<circle cx="42" cy="66" r="2.5"/><circle cx="50" cy="66" r="2.5"/><circle cx="58" cy="66" r="2.5"/></g>`
  ),
  // Borracharia
  "SAU-08": servico(
    `<circle cx="50" cy="50" r="27" stroke="none"/>` +
      `<circle cx="50" cy="50" r="27" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="4 4"/>` +
      `<circle cx="50" cy="50" r="13" fill="#fff" stroke="none"/><circle cx="50" cy="50" r="5" stroke="none"/>`
  ),
  // Abastecimento
  "SAU-09": servico(
    `<rect x="30" y="24" width="28" height="48" rx="3" stroke="none"/>` +
      `<rect x="35" y="30" width="18" height="12" fill="#fff" stroke="none"/>` +
      `<path d="M58 34 H66 V64 Q66 70 61 70" fill="none" stroke-width="3.5"/>` +
      `<rect x="26" y="72" width="36" height="5" stroke="none"/>`
  ),
  // Pronto-socorro
  "SAU-10": servico(
    `<rect x="41" y="24" width="18" height="52" fill="${VERMELHO}" stroke="none"/>` +
      `<rect x="24" y="41" width="52" height="18" fill="${VERMELHO}" stroke="none"/>`
  ),
  // Restaurante
  "SAU-12": servico(
    `<g stroke="none"><rect x="30" y="22" width="3" height="20"/><rect x="35.5" y="22" width="3" height="20"/><rect x="41" y="22" width="3" height="20"/>` +
      `<rect x="30" y="40" width="14" height="6" rx="2"/><rect x="34.5" y="44" width="5" height="34" rx="2"/>` +
      `<ellipse cx="63" cy="33" rx="8" ry="12"/><rect x="60.5" y="42" width="5" height="36" rx="2"/></g>`
  ),
  // Hotel
  "SAU-13": servico(
    `<g stroke="none"><rect x="20" y="34" width="5" height="40"/><rect x="20" y="56" width="60" height="8"/><rect x="75" y="56" width="5" height="18"/>` +
      `<circle cx="33" cy="49" r="6"/><rect x="41" y="44" width="34" height="11" rx="4"/></g>`
  ),
  // Pedágio
  "SAU-18": servico(
    `<g stroke="none"><rect x="20" y="24" width="60" height="7"/><rect x="24" y="31" width="6" height="45"/><rect x="70" y="31" width="6" height="45"/>` +
      `<rect x="38" y="44" width="22" height="32"/><rect x="42" y="48" width="14" height="10" fill="#fff"/></g>` +
      `<path d="M60 60 H70" stroke-width="4" stroke="${VERMELHO}"/>`
  ),
  // Aeroporto
  "SAU-21": servico(
    `<path stroke="none" d="M50 18 C53 18 54 22 54 26 V40 L78 53 V59 L54 52 V66 L61 71 V76 L50 73 L39 76 V71 L46 66 V52 L22 59 V53 L46 40 V26 C46 22 47 18 50 18 Z"/>`,
    VERDE
  ),
  // Terminal rodoviário
  "SAU-26": servico(
    `<g stroke="none"><rect x="27" y="20" width="46" height="52" rx="7"/><rect x="31" y="74" width="9" height="7" rx="2"/><rect x="60" y="74" width="9" height="7" rx="2"/></g>` +
      `<g fill="#fff" stroke="none"><rect x="32" y="28" width="36" height="20" rx="2"/><circle cx="36" cy="62" r="3.5"/><circle cx="64" cy="62" r="3.5"/><rect x="40" y="22" width="20" height="3"/></g>`
  ),
  // Parque (árvores)
  "TAR-03": turismo(
    `<g stroke="none"><path d="M34 18 L52 52 H16 Z"/><path d="M34 34 L56 70 H12 Z"/><rect x="31" y="70" width="6" height="12"/>` +
      `<path d="M68 30 L84 60 H52 Z"/><path d="M68 44 L88 76 H48 Z"/><rect x="65" y="76" width="6" height="8"/></g>`
  ),
  // Museu
  "THC-05": turismo(
    `<g stroke="none"><path d="M50 16 L84 34 H16 Z"/><rect x="18" y="36" width="64" height="5"/>` +
      `<rect x="23" y="44" width="7" height="28"/><rect x="37" y="44" width="7" height="28"/><rect x="56" y="44" width="7" height="28"/><rect x="70" y="44" width="7" height="28"/>` +
      `<rect x="16" y="74" width="68" height="6"/><rect x="12" y="82" width="76" height="5"/></g>`
  ),
  // Biblioteca
  "THC-11": turismo(
    `<path d="M50 30 Q36 22 18 26 V64 Q36 60 50 68 Q64 60 82 64 V26 Q64 22 50 30 Z" stroke="none"/>` +
      `<path d="M50 30 V68" stroke="${MARROM}" stroke-width="2.5"/>` +
      `<path d="M28 80 H66 M58 73 L68 80 L58 87" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`
  ),
  // Cachoeira
  "TNA-05": turismo(
    `<path d="M14 24 H44 V40 H14 Z M58 24 H86 V44 H58 Z" stroke="none"/>` +
      `<path d="M47 22 V70 M53 22 V74 M41 44 V72 M59 48 V76" fill="none" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M14 82 Q24 74 34 82 T54 82 T74 82 T88 80" fill="none" stroke-width="3.5"/>`
  ),
  // Patrimônio natural
  "TNA-06": turismo(
    `<circle cx="72" cy="28" r="9" stroke="none"/>` +
      `<path d="M10 80 L38 34 L52 56 L62 44 L90 80 Z" stroke="none"/>` +
      `<path d="M38 34 L44 44 L38 42 L32 44 Z" fill="${MARROM}" stroke="none"/>`
  ),
  // Acessibilidade
  "DEF-01": svg(
    `<rect x="2" y="2" width="96" height="96" rx="8" fill="${AZUL}" stroke="#fff" stroke-width="2"/>` +
      `<g fill="#fff" stroke="#fff"><circle cx="44" cy="20" r="7" stroke="none"/>` +
      `<path d="M44 30 V54 H66 L74 76" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M44 40 H62" fill="none" stroke-width="6" stroke-linecap="round"/>` +
      `<path d="M34 46 A20 20 0 1 0 64 70" fill="none" stroke-width="6" stroke-linecap="round"/></g>`
  ),
  // Cruz de Santo André (passagem de nível)
  "A-41": svg(
    `<g transform="rotate(38 50 50)"><rect x="6" y="41" width="88" height="18" fill="#fff" stroke="${VERMELHO}" stroke-width="4"/></g>` +
      `<g transform="rotate(-38 50 50)"><rect x="6" y="41" width="88" height="18" fill="#fff" stroke="${VERMELHO}" stroke-width="4"/></g>` +
      `<g transform="rotate(38 50 50)"><rect x="8" y="43" width="84" height="14" fill="#fff"/></g>`
  ),
  // Pedestre à esquerda, ciclista à direita
  "R-35": regulamentacao(
    `<path d="M50 12 V88" stroke-width="3"/>` + pedestre(30, 52, 0.9) + bicicleta(70, 50, 0.75)
  ),
  // Circulação compartilhada de pedestres e ciclistas
  "R-44": regulamentacao(pedestre(50, 36, 0.75) + `<path d="M24 52 H76" stroke-width="3"/>` + bicicleta(50, 68, 0.75)),
};

for (const [codigo, conteudo] of Object.entries(placas)) {
  writeFileSync(join(dir, `${codigo}.svg`), conteudo);
}
console.log(`${Object.keys(placas).length} placas desenhadas em img/placas/`);
