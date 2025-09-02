import { supabase } from "@/lib/supabaseClient";
import { notFound } from "next/navigation";

export default async function MangaDetail({ params }: { params: { id: string } }) {
  const { data: manga, error } = await supabase
    .from("manga")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!manga || error) notFound();

  return (
    <main style={{ padding: "2rem" }}>
      <h1>{manga.title}</h1>
      <img src={manga.cover} alt={manga.title} style={{ width: "300px" }} />
      <p>{manga.summary}</p>

      <h2>良い評価</h2>
      <ul>{manga.good_reviews?.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>

      <h2>悪い評価</h2>
      <ul>{manga.bad_reviews?.map((r: string, i: number) => <li key={i}>{r}</li>)}</ul>

      <div>
        <a href={manga.amazon_link} target="_blank">Amazon</a> |{" "}
        <a href={manga.wikipedia_link} target="_blank">Wikipedia</a> |{" "}
        <a href={manga.official_link} target="_blank">公式サイト</a>
      </div>
    </main>
  );
}