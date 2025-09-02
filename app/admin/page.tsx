"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

type Manga = {
  id: string;
  title: string;
  cover: string;
  summary: string;
  good_reviews: string[];
  bad_reviews: string[];
  amazon_link?: string;
  wikipedia_link?: string;
  official_link?: string;
  user_id?: string;
};

const ADMIN_UUID = "65935db6-641f-4344-bb2f-46a7c180c59f";
const initForm: Manga = {
  id: "",
  title: "",
  cover: "",
  summary: "",
  good_reviews: [],
  bad_reviews: [],
  amazon_link: "",
  wikipedia_link: "",
  official_link: "",
};

export default function AdminPage() {
  const [list, setList] = useState<Manga[]>([]);
  const [form, setForm] = useState<Manga>(initForm);
  const [uid, setUid] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        window.location.href = "/login"; // 未ログインならログインページへ
        return;
      }
      const id = data.user.id;
      setUid(id);
      setIsAdmin(id === ADMIN_UUID);
      fetchManga(id === ADMIN_UUID, id);
    });
  }, []);

  async function fetchManga(admin: boolean, id: string | null) {
    let q = supabase.from("manga").select("*").order("updated_at", { ascending: false });
    if (!admin && id) q = q.eq("user_id", id);
    const { data } = await q;
    if (data) setList(data as Manga[]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name.includes("reviews")
        ? value.split(",").map(v => v.trim()).filter(Boolean)
        : value
    }));
  }

  async function handleSave() {
    if (!form.id) return alert("IDは必須です");
    if (!uid) return alert("ログインしてください");

    const { error } = await supabase.from("manga").upsert({
      ...form,
      user_id: uid,
      updated_at: new Date().toISOString(),
    });
    if (error) return alert(`保存に失敗しました: ${error.message}`);
    alert("保存しました");
    setForm(initForm);
    fetchManga(isAdmin, uid);
  }

  function handleEdit(m: Manga) {
    setForm(m);
  }

  async function handleDelete(id: string) {
    if (!confirm("削除しますか？")) return;
    const { error } = await supabase.from("manga").delete().eq("id", id);
    if (!error) fetchManga(isAdmin, uid);
  }

  async function handleAiFetch() {
    if (!form.id || !form.title) return alert("IDとタイトルを入力してください");
    const res = await fetch("/api/fetchMangaInfo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: form.id, title: form.title }),
    });
    const data = await res.json();
    if (data.error) return alert(`AI取得に失敗しました: ${data.error}`);
    setForm(prev => ({
      ...prev,
      summary: data.summary || prev.summary,
      good_reviews: data.good_reviews || prev.good_reviews,
      bad_reviews: data.bad_reviews || prev.bad_reviews,
      amazon_link: data.amazon_link || prev.amazon_link,
      wikipedia_link: data.wikipedia_link || prev.wikipedia_link,
      official_link: data.official_link || prev.official_link,
    }));
  }

  const sectionStyle = {
    background: "#fff",
    color: "#000",
    padding: "1rem",
    borderRadius: "8px",
    marginBottom: "2rem",
    border: "1px solid #ccc",
  };

  const inputStyle = {
    padding: "0.5rem",
    border: "1px solid #555",
    borderRadius: "4px",
    fontSize: "14px",
    color: "#000",
    background: "#fff",
  };

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif", background: "#fff", color: "#000" }}>
      <h1 style={{ marginBottom: "1rem" }}>管理画面 {isAdmin && "(管理者)"}</h1>

      {/* 入力フォーム */}
      <section style={sectionStyle}>
        <h2>{form.id ? "編集" : "新規追加"}</h2>
        <div style={{ display: "grid", gap: "0.5rem", marginTop: "1rem" }}>
          {[
            { name: "id", label: "ID" },
            { name: "title", label: "タイトル" },
            { name: "cover", label: "表紙URL" },
            { name: "summary", label: "あらすじ", textarea: true },
            { name: "good_reviews", label: "良い評価（カンマ区切り）" },
            { name: "bad_reviews", label: "悪い評価（カンマ区切り）" },
            { name: "amazon_link", label: "Amazonリンク" },
            { name: "wikipedia_link", label: "Wikipediaリンク" },
            { name: "official_link", label: "公式サイトリンク" },
          ].map(f => (
            <div key={f.name} style={{ display: "flex", flexDirection: "column" }}>
              <label style={{ fontWeight: "bold" }}>{f.label}</label>
              {f.textarea ? (
                <textarea
                  name={f.name}
                  value={form[f.name as keyof Manga] as string}
                  onChange={handleChange}
                  style={inputStyle}
                />
              ) : (
                <input
                  name={f.name}
                  value={Array.isArray(form[f.name as keyof Manga])
                    ? (form[f.name as keyof Manga] as string[]).join(",")
                    : (form[f.name as keyof Manga] as string)}
                  onChange={handleChange}
                  style={inputStyle}
                />
              )}
            </div>
          ))}
        </div>
        <div style={{ marginTop: "1rem" }}>
          <button onClick={handleSave} style={{ marginRight: "0.5rem" }}>保存</button>
          <button onClick={() => setForm(initForm)} style={{ marginRight: "0.5rem" }}>リセット</button>
          <button onClick={handleAiFetch}>AIで取得</button>
        </div>
      </section>

      {/* 一覧表示 */}
      <section style={sectionStyle}>
        <h2>登録済み漫画</h2>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
          <thead>
            <tr style={{ background: "#0070f3", color: "#fff" }}>
              <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>ID</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>タイトル</th>
              <th style={{ padding: "0.5rem", border: "1px solid #ccc" }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {list.map(m => (
              <tr key={m.id} style={{ background: "#fafafa" }}>
                <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>{m.id}</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>{m.title}</td>
                <td style={{ padding: "0.5rem", border: "1px solid #ccc" }}>
                  <button onClick={() => handleEdit(m)} style={{ marginRight: "0.5rem" }}>編集</button>
                  <button onClick={() => handleDelete(m.id)}>削除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}