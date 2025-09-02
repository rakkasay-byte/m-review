import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { id, title } = await req.json();
  if (!id || !title) {
    return NextResponse.json({ error: "idとtitleは必須です" }, { status: 400 });
  }

  const modelName = "llama-3.1-8b-instant";
  const prompt = `
漫画「${title}」の1巻について、以下のJSON形式で出力してください。
必ず有効なJSONだけを返し、前後に説明文やコードブロックは付けないでください。
{
  "summary": "あらすじ（日本語）",
  "good_reviews": ["良い評価1", "良い評価2"],
  "bad_reviews": ["悪い評価1", "悪い評価2"],
  "amazon_link": "https://...",
  "wikipedia_link": "https://...",
  "official_link": "https://..."
}
`;

  try {
    console.log("[API] Groq呼び出し開始", { model: modelName });

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[API] Groq APIエラー:", errText);
      return NextResponse.json({ error: "Groq APIエラー", details: errText }, { status: res.status });
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content;

    // 1. すでにオブジェクトならそのまま返す
    if (typeof content === "object" && content !== null) {
      console.log("[API] contentはオブジェクトとして返却されました");
      return NextResponse.json(content);
    }

    // 2. 文字列ならJSON部分を抽出
    if (typeof content === "string") {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        console.error("[API] JSON部分が見つかりません:", content);
        return NextResponse.json({ error: "JSON部分が見つかりません", raw: content }, { status: 500 });
      }
      try {
        const parsed = JSON.parse(match[0]);
        return NextResponse.json(parsed);
      } catch {
        console.error("[API] JSONパース失敗:", match[0]);
        return NextResponse.json({ error: "JSONパース失敗", raw: match[0] }, { status: 500 });
      }
    }

    // 3. どちらでもない場合
    console.error("[API] contentが文字列でもオブジェクトでもありません:", content);
    return NextResponse.json({ error: "AIの出力形式が不明", raw: content }, { status: 500 });

  } catch (err: any) {
    console.error("[API] 例外発生:", err);
    return NextResponse.json({ error: "AI取得に失敗しました", details: err.message || String(err) }, { status: 500 });
  }
}