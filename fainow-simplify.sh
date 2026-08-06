#!/usr/bin/env bash
# Fainow · Wrapper do Agente Simplificador
set -euo pipefail

: "${REPO:?}"; : "${HEAD_BRANCH:?}"; : "${RUN_ID:?}"
: "${GITHUB_TOKEN:?falta GITHUB_TOKEN (PAT fine-grained)}"
: "${CLAUDE_CODE_OAUTH_TOKEN:?falta CLAUDE_CODE_OAUTH_TOKEN (claude setup-token)}"

FIX_BRANCH="fix/fainow-simplify-${RUN_ID}"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "[runner] clonando ${REPO} @ ${HEAD_BRANCH}"
git clone --depth 1 --branch "${HEAD_BRANCH}" \
  "https://x-access-token:${GITHUB_TOKEN}@github.com/${REPO}.git" "$WORK/repo"
cd "$WORK/repo"
git config user.name  "Fainow Simplify Bot"
git config user.email "bot@fainow.com"
git checkout -b "${FIX_BRANCH}"

PROMPT=$(cat "$(dirname "$0")/prompt.md")

echo "[runner] rodando Claude Code (assinatura)..."
claude -p "${PROMPT}" \
  --permission-mode acceptEdits \
  --allowedTools "Read,Edit,Write,Bash(git:*),Bash(npm:*),Bash(npx:*)" \
  || { echo "[runner] claude retornou erro"; }

if git diff --quiet && git diff --cached --quiet; then
  echo "[runner] sem alterações — nada a propor."
  exit 0
fi

git add -A
git commit -m "refactor: simplificação automática (teto de qualidade estourado)"
git push -u origin "${FIX_BRANCH}"

GH_TOKEN="${GITHUB_TOKEN}" gh pr create \
  --repo "${REPO}" \
  --base "${HEAD_BRANCH}" \
  --head "${FIX_BRANCH}" \
  --title "Simplificação automática — teto de qualidade" \
  --body "Reduz complexidade/tamanho e reforça testes para a PR #${PR_NUMBER:-?} passar nos quality gates. Gerada pelo Agente Simplificador da Fainow. Revise antes de mesclar. CI: ${RUN_URL:-n/a}"

if [ -n "${PR_NUMBER:-}" ]; then
  GH_TOKEN="${GITHUB_TOKEN}" gh pr comment "${PR_NUMBER}" --repo "${REPO}" \
    --body "O teto de qualidade estourou nesta PR. Abri a correção automática no branch \`${FIX_BRANCH}\` — revise e mescle nela."
fi

echo "[runner] concluído."
