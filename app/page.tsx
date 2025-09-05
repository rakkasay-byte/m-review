import { supabase } from "@/lib/supabaseClient";
import MangaGrid from "@/components/MangaGrid/MangaGrid";

export default async function Home() {
  // DBからマンガ一覧を取得
  const { data: mangaList, error } = await supabase
    .from("manga")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error(error);
    return <p>データ取得エラー</p>;
  }

  return (
    <>
      {/* ページ固有の見出し */}
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
        注目のマンガ
      </h1>

      {/* 共通デザインのカードグリッド */}
      <MangaGrid items={mangaList || []} />
    </>
  );
}