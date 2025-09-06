"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Manga = {
  id?: string;
  title: string;
  title_kana?: string;
  cover: string;
  summary: string;
  good_reviews: string[];
  bad_reviews: string[];
  amazon_link?: string;
  wikipedia_link?: string;
  official_link?: string;
  rakuten_link?: string;
  source_urls?: string[];
};

type AuthorInput = { name: string };
type MagazineInput = { name: string };

const initForm: Manga = {
  id: "",
  title: "",
  title_kana: "",
  cover: "",
  summary: "",
  good_reviews: [],
  bad_reviews: [],
  amazon_link: "",
  wikipedia_link: "",
  official_link: "",
  rakuten_link: "",
  source_urls: [],
};

const RAKUTEN_API = "https://app.rakuten.co.jp/services/api/IchibaItem/Search/20170706";
const RAKUTEN_BOOKS_API = "https://app.rakuten.co.jp/services/api/BooksBook/Search/20170404";
const RAKUTEN_GENRE_MANGA = 101299;

const RAKUTEN_BOOKS_AFFILIATE_BASE =
  "https://hb.afl.rakuten.co.jp/hgc/16fadf06.5e5fb472.16fadf07.8208f37e/?pc=";
const RAKUTEN_BOOKS_AFFILIATE_SUFFIX =
  "&link_type=hybrid_url&ut=eyJwYWdlIjoidXJsIiwidHlwZSI6Imh5YnJpZF91cmwiLCJjb2wiOjF9";

const to600Image = (url: string) => {
  if (!url) return url;
  if (url.includes("_ex=")) {
    return url.replace(/_ex=\d+x\d+/, "_ex=600x600");
  }
  return url.replace(/(\d{2,4}x\d{2,4})/, "600x600");
};

export default function AdminPage() {
  const [form, setForm] = useState<Manga>(initForm);
  const [authors, setAuthors] = useState<AuthorInput[]>([{ name: "" }]);
  const [magazines, setMagazines] = useState<MagazineInput[]>([{ name: "" }]);
  const [loading, setLoading] = useState(false);
  const [aiResult, setAiResult] = useState("");
  const [list, setList] = useState<Manga[]>([]);

  const fetchList = async () => {
    const { data } = await supabase.from("manga").select("id,title,title_kana").order("title_kana");
    setList(data || []);
  };
  useEffect(() => { fetchList(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addAuthor = () => setAuthors([...authors, { name: "" }]);
  const updateAuthor = (i: number, value: string) => {
    const updated = [...authors];
    updated[i].name = value;
    setAuthors(updated);
  };
  const removeAuthor = (i: number) => setAuthors(authors.filter((_, idx) => idx !== i));

  const addMagazine = () => setMagazines([...magazines, { name: "" }]);
  const updateMagazine = (i: number, value: string) => {
    const updated = [...magazines];
    updated[i].name = value;
    setMagazines(updated);
  };
  const removeMagazine = (i: number) => setMagazines(magazines.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("ログインしてください");
        setLoading(false);
        return;
      }

      const { id, ...rest } = form;
      const payload: any = {
        ...rest,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };
      if (id) payload.id = id;

      const { data: mangaData, error: mangaError } = await supabase
        .from("manga")
        .upsert(payload)
        .select()
        .single();

      if (mangaError) throw mangaError;

      // 作者登録
      const uniqueAuthors = Array.from(new Set(authors.map(a => a.name.trim()).filter(Boolean)));
      for (const name of uniqueAuthors) {
        let { data: existing } = await supabase
          .from("authors")
          .select("id")
          .eq("name", name)
          .single();
        if (!existing) {
          const { data: newAuthor } = await supabase
            .from("authors")
            .insert([{ name }])
            .select()
            .single();
          existing = newAuthor;
        }
        await supabase.from("manga_authors").upsert({
          manga_id: mangaData.id,
          author_id: existing.id
        });
      }

      // 雑誌登録
      const uniqueMagazines = Array.from(new Set(magazines.map(m => m.name.trim()).filter(Boolean)));
      for (const name of uniqueMagazines) {
        let { data: existingMagazine } = await supabase
          .from("magazines")
          .select("id")
          .eq("name", name)
          .single();
        if (!existingMagazine) {
          const { data: newMagazine } = await supabase
            .from("magazines")
            .insert([{ name }])
            .select()
            .single();
          existingMagazine = newMagazine;
        }
        await supabase.from("manga_magazines").upsert({
          manga_id: mangaData.id,
          magazine_id: existingMagazine.id
        });
      }

      alert("保存しました");
      if (!form.id && mangaData?.id) {
        setForm(prev => ({ ...prev, id: mangaData.id }));
      }
      fetchList();
    } catch (err: any) {
      alert(`保存に失敗しました: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string) => {
    const { data } = await supabase.from("manga").select("*").eq("id", id).single();
    if (data) {
      setForm({
        ...data,
        good_reviews: data.good_reviews || [],
        bad_reviews: data.bad_reviews || [],
        source_urls: data.source_urls || [],
      });
      const { data: authorData } = await supabase
        .from("manga_authors")
        .select("authors(name)")
        .eq("manga_id", id);
      if (authorData) {
        setAuthors(authorData.map((a: any) => ({ name: a.authors.name })));
      }
      const { data: magazineData } = await supabase
        .from("manga_magazines")
        .select("magazines(name)")
        .eq("manga_id", id);
      if (magazineData) {
        setMagazines(magazineData.map((m: any) => ({ name: m.magazines.name })));
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("削除しますか？")) return;
    await supabase.from("manga").delete().eq("id", id);
    fetchList();
  };

  const handleRakutenBooksLinkFetch = () => {
    if (!form.title) {
      alert("タイトルを入力してください");
      return;
    }
    const searchUrl = `https://books.rakuten.co.jp/search?sitem=${encodeURIComponent(form.title)}&g=000&l-id=pc-search-box`;
    const affiliateUrl =
      RAKUTEN_BOOKS_AFFILIATE_BASE + encodeURIComponent(searchUrl) + RAKUTEN_BOOKS_AFFILIATE_SUFFIX;
    setForm(prev => ({
      ...prev,
      rakuten_link: affiliateUrl
    }));
  };

  const handleRakutenImageFetch = async () => {
    if (!form.title) {
      alert("タイトルを入力してください");
      return;
    }
    const keyword = `${form.title}1`;

    // 楽天ブックスAPI
    try {
      const resBooks = await fetch(
        `${RAKUTEN_BOOKS_API}?applicationId=${process.env.NEXT_PUBLIC_RAKUTEN_APP_ID}&title=${encodeURIComponent(keyword)}&hits=10&imageFlag=1&formatVersion=2`
      );
      const dataBooks = await resBooks.json();

      if (dataBooks.Items?.length > 0) {
        const firstVol = dataBooks.Items.find((it: any) =>
          /1巻|第1巻|1$/.test(it.title)
        ) || dataBooks.Items[0];

        const imgUrl = firstVol.mediumImageUrl || "";
        if (imgUrl) {
          setForm(prev => ({
            ...prev,
            cover: to600Image(imgUrl)
          }));
          return;
        }
      }
    } catch {
      // ブックスAPI失敗時はフォールバックへ
    }

    // 楽天市場API
    try {
      const resIchiba = await fetch(
        `${RAKUTEN_API}?applicationId=${process.env.NEXT_PUBLIC_RAKUTEN_APP_ID}&keyword=${encodeURIComponent(keyword)}&genreId=${RAKUTEN_GENRE_MANGA}&hits=10&imageFlag=1&formatVersion=2`
      );
      const dataIchiba = await resIchiba.json();

      if (dataIchiba.Items?.length > 0) {
        const firstVol = dataIchiba.Items.find((it: any) =>
          /1巻|第1巻|1$/.test(it.Item.itemName)
        )?.Item || dataIchiba.Items[0].Item;

        const imgUrl = firstVol.mediumImageUrls?.[0]?.imageUrl || "";
        if (imgUrl) {
          setForm(prev => ({
            ...prev,
            cover: to600Image(imgUrl)
          }));
          return;
        }
      }
      alert("楽天ブックス・楽天市場ともに1巻の商品が見つかりませんでした");
    } catch {
      alert("画像取得に失敗しました");
    }
  };

  // AI取得（雑誌対応＋レビュー5件指定）
  const handleAiFetch = async () => {
  if (!form.title) {
    alert("タイトルを入力してください");
    return;
  }
  setLoading(true);
  try {
    const sourceUrlsText = (form.source_urls && form.source_urls.length > 0)
      ? `参考用URLとして以下を必ず参照してください:\n${form.source_urls.join("\n")}`
      : "";

    const prompt = `
漫画タイトル「${form.title}」について、以下の条件で情報をJSON形式で返してください。

- "good_reviews" と "bad_reviews" は、日本語のウェブサイトの情報のみを参照し、必ず5件ずつ挙げてください。
- 評価は必ず原作漫画に関するものだけを対象とし、アニメ版や実写映画版など他メディア化作品の感想は含めないでください。
- "magazines" は連載雑誌名の配列として返してください（連載途中で変更があれば全て含める）。
- それ以外の項目は、日本語のウェブサイト（公式サイト、出版社サイト、日本語のニュースサイト、Wikipedia日本語版、レビューサイトなど）の情報のみを参照してください。
- "source_urls" はAIで取得しないでください。${sourceUrlsText}

返すJSONの形式:
{
  "title_kana": "カタカナ読み仮名",
  "authors": ["作者名1", "作者名2"],
  "magazines": ["雑誌名1", "雑誌名2"],
  "summary": "あらすじ",
  "good_reviews": ["良い評価1", "良い評価2", "良い評価3", "良い評価4", "良い評価5"],
  "bad_reviews": ["悪い評価1", "悪い評価2", "悪い評価3", "悪い評価4", "悪い評価5"],
  "official_link": "公式サイトURL",
  "amazon_link": "Amazon日本のシリーズページURL",
  "wikipedia_link": "WikipediaURL"
}
    `.trim();

    const res = await fetch("/api/ai-fetch", {
      method: "POST",
      body: JSON.stringify({ prompt }),
    });
    const data = await res.json();
    setAiResult(JSON.stringify(data, null, 2));
  } catch {
    alert("AI取得に失敗しました");
  } finally {
    setLoading(false);
  }
};

  const copyPromptToClipboard = () => {
  const sourceUrlsText = (form.source_urls && form.source_urls.length > 0)
    ? `参考用URLとして以下を必ず参照してください:\n${form.source_urls.join("\n")}`
    : "";

  const prompt = `
漫画タイトル「${form.title}」について、以下の条件で情報をJSON形式で返してください。

- "good_reviews" と "bad_reviews" は、日本語のウェブサイトの情報のみを参照し、必ず5件ずつ挙げてください。
- 評価は必ず原作漫画に関するものだけを対象とし、アニメ版や実写映画版など他メディア化作品の感想は含めないでください。
- "magazines" は連載雑誌名の配列として返してください（連載途中で変更があれば全て含める）。
- それ以外の項目は、日本語のウェブサイト（公式サイト、出版社サイト、日本語のニュースサイト、Wikipedia日本語版、レビューサイトなど）の情報のみを参照してください。
- "source_urls" はAIで取得しないでください。${sourceUrlsText}

返すJSONの形式:
{
  "title_kana": "カタカナ読み仮名",
  "authors": ["作者名1", "作者名2"],
  "magazines": ["雑誌名1", "雑誌名2"],
  "summary": "あらすじ",
  "good_reviews": ["良い評価1", "良い評価2", "良い評価3", "良い評価4", "良い評価5"],
  "bad_reviews": ["悪い評価1", "悪い評価2", "悪い評価3", "悪い評価4", "悪い評価5"],
  "official_link": "公式サイトURL",
  "amazon_link": "Amazon日本のシリーズページURL",
  "wikipedia_link": "WikipediaURL"
}
  `.trim();

  navigator.clipboard.writeText(prompt);
  alert("プロンプトをコピーしました");
};

  const applyAiResult = () => {
    try {
      const parsed = JSON.parse(aiResult);

      setForm((prev) => ({
        ...prev,
        title_kana: parsed.title_kana || prev.title_kana,
        summary: parsed.summary || prev.summary,
        good_reviews: parsed.good_reviews || prev.good_reviews,
        bad_reviews: parsed.bad_reviews || prev.bad_reviews,
        official_link: parsed.official_link || prev.official_link,
        amazon_link: parsed.amazon_link || prev.amazon_link,
        wikipedia_link: parsed.wikipedia_link || prev.wikipedia_link,
        source_urls: parsed.source_urls || prev.source_urls,
      }));

      if (parsed.authors) {
        const uniqueAuthors = Array.from(new Set(parsed.authors.filter((n: string) => n && n.trim())));
        setAuthors(uniqueAuthors.map((name: string) => ({ name })));
      }
      if (parsed.magazines) {
        const uniqueMagazines = Array.from(new Set(parsed.magazines.filter((n: string) => n && n.trim())));
        setMagazines(uniqueMagazines.map((name: string) => ({ name })));
      }
    } catch {
      alert("AI結果のJSONが不正です");
    }
  };

  const sectionStyle = { marginBottom: "2rem" };
  const labelStyle = { fontWeight: "bold", marginBottom: "0.25rem", color: "#111" };
  const inputStyle = {
    color: "#111",
    backgroundColor: "#fff",
    border: "1px solid #ccc",
    padding: "0.5rem",
    borderRadius: "4px",
    width: "100%",
    marginBottom: "0.5rem",
  };

  return (
    <div className="admin-page" style={{ color: "#111" }}>
      <h1>漫画登録</h1>

      {/* 基本情報 */}
      <div style={sectionStyle}>
        <h2 style={labelStyle}>基本情報</h2>
        <input style={inputStyle} name="id" placeholder="ID（空欄で新規）" value={form.id} onChange={handleChange} />
        <input style={inputStyle} name="title" placeholder="タイトル" value={form.title} onChange={handleChange} />
        <input style={inputStyle} name="title_kana" placeholder="読み仮名（カタカナ）" value={form.title_kana} onChange={handleChange} />

        <input style={inputStyle} name="cover" placeholder="表紙URL" value={form.cover} onChange={handleChange} />
        {form.cover?.trim() && (
          <div style={{ marginTop: "0.5rem" }}>
            <img
              src={form.cover}
              alt={`${form.title || "表紙"} プレビュー`}
              style={{ width: "160px", height: "240px", objectFit: "contain", border: "1px solid #ccc", borderRadius: "4px" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          </div>
        )}
        <button type="button" onClick={handleRakutenImageFetch}>楽天画像取得</button>

        <input style={inputStyle} name="rakuten_link" placeholder="楽天アフィリエイトリンク" value={form.rakuten_link || ""} onChange={handleChange} />
        <button type="button" onClick={handleRakutenBooksLinkFetch}>楽天リンク取得</button>
      </div>

      {/* 作者 */}
      <div style={sectionStyle}>
        <h2 style={labelStyle}>作者</h2>
        {authors.map((a, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              style={inputStyle}
              placeholder="名前"
              value={a.name}
              onChange={(e) => updateAuthor(i, e.target.value)}
            />
            {authors.length > 1 && (
              <button type="button" onClick={() => removeAuthor(i)}>削除</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addAuthor}>＋作者追加</button>
      </div>

      {/* 連載雑誌 */}
      <div style={sectionStyle}>
        <h2 style={labelStyle}>連載雑誌</h2>
        {magazines.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <input
              style={inputStyle}
              placeholder="雑誌名"
              value={m.name}
              onChange={(e) => updateMagazine(i, e.target.value)}
            />
            {magazines.length > 1 && (
              <button type="button" onClick={() => removeMagazine(i)}>削除</button>
            )}
          </div>
        ))}
        <button type="button" onClick={addMagazine}>＋雑誌追加</button>
      </div>

      {/* 内容 */}
      <div style={sectionStyle}>
        <h2 style={labelStyle}>内容</h2>
        <textarea
          style={{ ...inputStyle, height: "6rem" }}
          name="summary"
          placeholder="あらすじ"
          value={form.summary}
          onChange={handleChange}
        />
      </div>

      {/* 評価 */}
      <div style={sectionStyle}>
        <h2 style={labelStyle}>評価</h2>
        <input
          style={inputStyle}
          name="good_reviews"
          placeholder="良い評価（カンマ区切り）"
          value={(form.good_reviews || []).join(",")}
          onChange={(e) =>
            setForm({ ...form, good_reviews: e.target.value.split(",").map(s => s.trim()) })
          }
        />
        <input
          style={inputStyle}
          name="bad_reviews"
          placeholder="悪い評価（カンマ区切り）"
          value={(form.bad_reviews || []).join(",")}
          onChange={(e) =>
            setForm({ ...form, bad_reviews: e.target.value.split(",").map(s => s.trim()) })
          }
        />
      </div>

      {/* リンク */}
      <div style={sectionStyle}>
        <h2 style={labelStyle}>リンク</h2>
        <input style={inputStyle} name="official_link" placeholder="公式サイトリンク" value={form.official_link} onChange={handleChange} />
        <input style={inputStyle} name="amazon_link" placeholder="Amazonリンク" value={form.amazon_link} onChange={handleChange} />
        <input style={inputStyle} name="wikipedia_link" placeholder="Wikipediaリンク" value={form.wikipedia_link} onChange={handleChange} />
      </div>

      {/* 情報取得 */}
      <div style={sectionStyle}>
        <h2 style={labelStyle}>情報取得</h2>
        <textarea
          style={{ ...inputStyle, height: "6rem" }}
          name="source_urls"
          placeholder="情報取得用URL（改行区切り）"
          value={(form.source_urls || []).join("\n")}
          onChange={(e) =>
            setForm({ ...form, source_urls: e.target.value.split("\n").map(s => s.trim()) })
          }
        />
      </div>

      {/* 保存ボタン */}
      <button type="button" className="button" onClick={handleSave} disabled={loading}>
        {loading ? "保存中..." : "保存"}
      </button>

      {/* AI関連 */}
      <section style={{
        background: "#f9f9f9",
        border: "1px solid #ccc",
        borderRadius: "8px",
        padding: "1rem",
        marginTop: "2rem"
      }}>
        <h2 style={{ fontWeight: "bold", marginBottom: "0.75rem" }}>AI取得</h2>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          <button onClick={handleAiFetch} disabled={loading} style={{ padding: "0.5rem 0.75rem" }}>AIで取得</button>
          <button onClick={copyPromptToClipboard} style={{ padding: "0.5rem 0.75rem" }}>別AI用プロンプトをコピー</button>
        </div>

        <label style={labelStyle}>AI取得結果（JSON）</label>
        <textarea
          style={{
            ...inputStyle,
            height: "10rem",
            fontFamily: "monospace",
            background: "#f4f4f4"
          }}
          value={aiResult}
          onChange={(e) => setAiResult(e.target.value)}
        />
        <div style={{ marginTop: "0.5rem" }}>
          <button type="button" onClick={applyAiResult} style={{ padding: "0.5rem 0.75rem" }}>取得結果を適用</button>
        </div>
      </section>

      {/* 登録済み一覧 */}
      <div style={sectionStyle}>
        <h2 style={labelStyle}>登録済み一覧</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #ccc" }}>
          <thead style={{ backgroundColor: "#f5f5f5" }}>
            <tr>
              <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ccc" }}>ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ccc" }}>タイトル</th>
              <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ccc" }}>読み仮名</th>
              <th style={{ textAlign: "left", padding: "0.5rem", borderBottom: "1px solid #ccc" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map((m, idx) => (
              <tr
                key={m.id}
                style={{
                  backgroundColor: idx % 2 === 0 ? "#fff" : "#fafafa",
                  borderBottom: "1px solid #eee",
                }}
              >
                <td style={{ padding: "0.5rem" }}>{m.id}</td>
                <td style={{ padding: "0.5rem" }}>{m.title}</td>
                <td style={{ padding: "0.5rem" }}>{m.title_kana}</td>
                <td style={{ padding: "0.5rem" }}>
                  <button
                    style={{ marginRight: "0.5rem" }}
                    onClick={() => handleEdit(m.id!)}
                  >
                    編集
                  </button>
                  <button onClick={() => handleDelete(m.id!)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}