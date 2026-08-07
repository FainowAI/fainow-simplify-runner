// Fainow · Runner do Agente Simplificador
// Recebe a chamada do n8n quando o teto de qualidade estoura numa PR
// e dispara o Claude Code (headless, autenticado pela ASSINATURA — sem API key).
import express from "express";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "1mb" }));

const TOKEN = process.env.FAINOW_RUNNER_TOKEN || "";
const PORT = process.env.PORT || 8787;

// Diagnostico: informa se o token foi carregado no container (sem expor o valor).
app.get("/health", (_req, res) => res.json({
  ok: true,
  tokenConfigured: TOKEN.length > 0,
  tokenLen: TOKEN.length
}));

app.post("/simplify", (req, res) => {
  // 1) Autenticação: o n8n envia o mesmo token no header.
  if (!TOKEN || req.get("x-fainow-token") !== TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { repo, prNumber, headBranch, baseBranch, runUrl, runId } = req.body || {};
  if (!repo || !headBranch) {
    return res.status(400).json({ error: "missing repo/headBranch" });
  }

  // 2) Guarda anti-loop: se a PR que estourou já é uma PR do próprio agente,
  //    não dispara de novo (senão vira loop infinito).
  if (String(headBranch).startsWith("fix/fainow-simplify")) {
    return res.status(200).json({ status: "skipped", reason: "own-branch" });
  }

  // 3) Dispara o agente em background e responde rápido (o GitHub/n8n não espera).
  const child = spawn(
    "bash",
    [path.join(__dirname, "fainow-simplify.sh")],
    {
      detached: true,
      stdio: "ignore",
      env: {
        ...process.env,
        REPO: repo,
        PR_NUMBER: String(prNumber ?? ""),
        HEAD_BRANCH: headBranch,
        BASE_BRANCH: baseBranch ?? "",
        RUN_URL: runUrl ?? "",
        RUN_ID: String(runId ?? Date.now()),
      },
    }
  );
  child.unref();

  return res.status(202).json({ status: "started", repo, headBranch });
});

app.listen(PORT, () => console.log(`[fainow-runner] ouvindo na porta ${PORT}`));
