# Fainow · Runner do Agente Simplificador

Serviço que roda na sua VPS. Recebe a chamada do n8n quando uma PR estoura o teto de qualidade e dispara o Claude Code headless autenticado pela sua assinatura (sem API key paga) para simplificar o código e abrir uma PR de correção.

Variáveis necessárias: `FAINOW_RUNNER_TOKEN`, `CLAUDE_CODE_OAUTH_TOKEN` (via `claude setup-token`), `GITHUB_TOKEN` (PAT fine-grained com Contents RW + Pull requests RW).

Porta: 8787. Endpoints: `GET /health`, `POST /simplify`.
