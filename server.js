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

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post("/simplify", (req, res) => {
  if (!TOKEN || req.get("x-fainow-token") !== TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const { repo, prNumber, headBranch, baseBranch, runUrl, runId } = req.body || {};
  if (!repo || !headBranch) {
    return res.status(400).json({ error: "missing repo/headBranch" });
  }

  if (String(headBranch).startsWith("fix/fainow-simplify")) {
    return res.status(200).json({ status: "skipped", reason: "own-branch" });
  }

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
