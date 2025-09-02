import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default async function Home() {
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
    <main style={{ padding: "2rem" }}>
      <h1>漫画レビューサイト</h1>
      <div style={{
        display: "grid",
        gap: "1rem",
        gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))"
      }}>
        {mangaList?.map((manga) => (
          <Link key={manga.id} href={`/manga/${manga.id}`}>
            <img src={manga.cover} alt={manga.title} style={{ width: "100%" }} />
            <h2>{manga.title}</h2>
          </Link>
        ))}
      </div>
    </main>
  );
}