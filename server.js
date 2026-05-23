import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Anthropic from "@anthropic-ai/sdk";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, "dist")));

app.post("/api/generate", async (req, res) => {
  try {
    const { system, prompt } = req.body;
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "APIキーが設定されていません。Cloud Runの環境変数 API_KEY を確認してください。" });
    }
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    res.json({ text });
  } catch (err) {
    console.error("API error:", err.status, err.message);
    let message = "不明なエラーが発生しました";
    if (err.status === 401) message = "APIキーが無効です。Cloud Runの環境変数 API_KEY に正しいAnthropicキーを設定してください。";
    else if (err.status === 429) message = "APIクォータ制限に達しました。しばらく待ってから再試行してください。";
    else if (err.message) message = err.message;
    res.status(err.status || 500).json({ error: message });
  }
});

app.get("*", (_, res) => {
  res.sendFile(join(__dirname, "dist", "index.html"));
});

const port = parseInt(process.env.PORT || "8080");
app.listen(port, () => console.log(`Listening on :${port}`));
