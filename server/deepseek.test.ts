import { describe, it, expect } from "vitest";

describe("DeepSeek API Key Validation", () => {
  it("should successfully call DeepSeek V4 Flash API", async () => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    expect(apiKey, "DEEPSEEK_API_KEY must be set").toBeTruthy();

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          { role: "user", content: "Reply with exactly: OK" },
        ],
        max_tokens: 10,
      }),
    });

    expect(response.ok, `API call failed: ${response.status} ${response.statusText}`).toBe(true);

    const data = await response.json() as any;
    expect(data.choices).toBeDefined();
    expect(data.choices.length).toBeGreaterThan(0);
    expect(data.choices[0].message.content).toBeTruthy();
    console.log("DeepSeek V4 Flash response:", data.choices[0].message.content);
    console.log("Model used:", data.model);
  }, 30000);
});
