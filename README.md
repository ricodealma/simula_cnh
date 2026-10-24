# Simulado CNH MG – Prova Teórica

Simulador gratuito da prova teórica (a "prova de legislação") do DETRAN-MG, usando as
**1.500 questões oficiais** do *Banco Nacional de Questões – Versão 1.0* da Senatran
(programa CNH do Brasil).

## Regras da prova reproduzidas

Desde a Resolução CONTRAN nº 1.020/2025, todos os DETRANs (inclusive o de MG) aplicam
a prova teórica com as questões do Banco Nacional de Questões:

| Regra | Valor | Base |
|---|---|---|
| Número de questões | 30 | art. 33 |
| Alternativas | 4, apenas uma correta | art. 31 |
| Aprovação | mínimo de 20 acertos | art. 34 |
| Duração | 60 minutos (mínimo de 1 hora) | art. 33 |
| Tempo em dobro | candidatos com dislexia, TDAH ou TEA | art. 33 |

## Modos

### Modo simulação

Prova cronometrada no formato clássico do DETRAN, com as 30 questões divididas
por matéria:

| Matéria | Na prova | No banco do simulado |
|---|---|---|
| Legislação de Trânsito (inclui sinalização e infrações) | 12 | 240 |
| Direção Defensiva | 10 | 200 |
| Primeiros Socorros | 3 | ~55 |
| Meio Ambiente e Cidadania | 3 | ~45 |
| Mecânica Básica | 2 | 40 |

O banco do simulado (~580 questões, em `data/simulacao.json`) é uma seleção do
Banco Nacional de Questões feita por `scripts/montar-simulacao.mjs`:

- cada questão é classificada em uma das 5 matérias por palavras-chave, porque os
  4 módulos do banco oficial misturam as matérias;
- enunciados repetidos são removidos;
- têm prioridade as questões com base legal citada (CTB, resoluções), as de
  dificuldade intermediária/difícil e as do bloco "Parte 2 – Teste seus
  conhecimentos" do próprio banco.

O resultado mostra aprovado/reprovado, desempenho por matéria e correção comentada.

> Não existe lista pública das questões "que caem" na prova do DETRAN-MG. Desde a
> Resolução 1.020/2025 a prova é sorteada do Banco Nacional de Questões, que é a
> fonte usada aqui. Sites como o AprovaDetran usam bancos próprios, que não são
> públicos.

### Modo estudo

- **Prova com o banco completo**: 30 questões sorteadas das 1.500, proporcionalmente
  aos 4 módulos do curso CNH do Brasil (8 · 4 · 13 · 5), com as mesmas regras de tempo
  e aprovação.
- **Treino por módulo**: 20 questões de um módulo, sem cronômetro, com correção e
  comentário a cada resposta.

## Funcionalidades comuns

- Cronômetro de 60 min (ou 120 min com tempo em dobro), navegação livre entre as
  questões e encerramento automático quando o tempo acaba.
- Prova em andamento salva no navegador (pode recarregar a página e retomar).
- Histórico dos últimos 10 simulados.
- Atalhos: teclas `1`–`4` ou `A`–`D` para responder, setas para navegar.

## Tecnologia

Site 100% estático (HTML, CSS e JavaScript puro, sem build), então pode ser
hospedado de graça em qualquer serviço de páginas estáticas.

```
index.html          página única
css/style.css       estilos (tema claro/escuro automático)
js/app.js           lógica do simulado
data/questoes.json  banco completo gerado a partir do PDF oficial
data/simulacao.json seleção de questões do modo simulação, por matéria
data/placas.json    códigos de placa com imagem disponível
img/placas/         desenhos das placas (Wikimedia Commons + desenhados)
scripts/            scripts que geram os arquivos de data/ e img/
```

## Rodar localmente

```bash
python -m http.server 5173
```

Depois abra http://localhost:5173.

## Deploy gratuito

- **GitHub Pages**: suba o repositório para o GitHub (branch `main`) e, em
  *Settings → Pages*, escolha *Source: GitHub Actions*. O workflow
  `.github/workflows/pages.yml` publica a cada push.
- **Netlify / Cloudflare Pages / Vercel**: importe o repositório, sem comando de build,
  com diretório de publicação `/` (raiz).

## Atualizar o banco de questões

1. Baixe o PDF do Banco Nacional de Questões (disponível no material complementar do
   curso CNH do Brasil).
2. Converta e gere o JSON (precisa do `pdftotext`, do pacote Poppler):

   ```bash
   pdftotext -layout -enc UTF-8 banco.pdf banco.txt
   node scripts/parse-bnq.mjs banco.txt
   node scripts/desenhar-placas.mjs
   node scripts/baixar-placas.mjs
   node scripts/montar-simulacao.mjs
   ```

O PDF oficial traz só o código das placas (ex.: `A-33a`). As imagens vêm do
Wikimedia Commons. As 18 placas que não existem lá (serviços auxiliares, turismo,
acessibilidade, A-41, R-35 e R-44) são desenhadas por `desenhar-placas.mjs`. Se o
Commons limitar os downloads, `baixar-placas.mjs` grava a URL remota no lugar do
arquivo local; rode o script de novo mais tarde para baixar o que faltou.

---

Projeto independente de estudo, sem vínculo com o DETRAN-MG ou a Senatran.
