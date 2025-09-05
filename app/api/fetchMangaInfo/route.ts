import { NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";

/**
 * 指定したURL群をスクレイピングし、本文テキストを結合して返す
 * - script, style, noscript, iframe, svg, img などは除去
 * - 広告やSNS共有ボタンなど、よくある不要要素も除去
 */
async function scrapeUrls(urls: string[]): Promise<string> {
  let combinedText = "";

  for (const url of urls) {
    try {
      const { data } = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
        timeout: 10000,
      });

      const $ = cheerio.load(data);

      // 不要タグを削除
      $("script, style, noscript, iframe, svg, img, video, audio").remove();

      // よくある広告・不要要素のクラスやIDを削除
      const removeSelectors = [
        "[class*='ad-']",
        "[class*='ads']",
        "[id*='ad-']",
        "[id*='ads']",
        "[class*='banner']",
        "[class*='sns']",
        "[class*='share']",
        "[class*='footer']",
        "[class*='header']",
        "[class*='nav']",
        "[role='navigation']",
        "[aria-label='breadcrumb']",
      ];
      removeSelectors.forEach(sel => $(sel).remove());

      // 本文テキスト抽出
      const text = $("body").text().replace(/\s+/g, " ").trim();

      combinedText += `\n\n=== ${url} の本文 ===\n${text}`;
    } catch (err) {
      console.error(`[スクレイピング失敗] ${url}:`, err);
    }
  }

  return combinedText || "本文を取得できませんでした。";
}

export async function POST(req: Request) {
  const { id, title, sourceUrls } = await req.json();
  if (!id || !title) {
    return NextResponse.json(
      { error: "idとtitleは必須です" },
      { status: 400 }
    );
  }

  // スクレイピング（URLがあれば）
  let scrapedText = "";
  if (Array.isArray(sourceUrls) && sourceUrls.length > 0) {
    scrapedText = await scrapeUrls(sourceUrls);
  }

  const modelName = "llama-3.1-8b-instant";
  const prompt = `
あなたは日本語の情報収集と要約に長けたアシスタントです。
漫画「${title}」という作品全体について、次の条件で情報をまとめてください。

${scrapedText ? `以下は事前に取得した情報元の本文です:\n${scrapedText}` : "必要に応じて信頼できる日本語の公式サイトや公式配信ページを参照してください。"}

条件:
- "summary" には公式サイトや公式配信ページに掲載されているあらすじを日本語でそのまま引用（要約禁止）
- "good_reviews" と "bad_reviews" はそれぞれ最大5つの箇条書き（日本語）
- "amazon_link" "wikipedia_link" "official_link" は可能な限り正確に日本語版のURLを取得
- 必ず有効なJSONだけを返し、前後に説明文やコードブロックは付けないこと

出力形式:
{
  "summary": "公式あらすじ（日本語）",
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
      return NextResponse.json(
        { error: "Groq APIエラー", details: errText },
        { status: res.status }
      );
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content;

    if (typeof content === "string") {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) {
        return NextResponse.json({ error: "JSON部分が見つかりません", raw: content }, { status: 500 });
      }
      const parsed = JSON.parse(match[0]);
      return NextResponse.json(parsed);
    }

    return NextResponse.json({ error: "AIの出力形式が不明", raw: content }, { status: 500 });
  } catch (err: any) {
    console.error("[API] 例外発生:", err);
    return NextResponse.json(
      { error: "AI取得に失敗しました", details: err.message || String(err) },
      { status: 500 }
    );
  }
}