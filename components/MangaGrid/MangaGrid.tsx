import styles from "./MangaGrid.module.css";
import MangaCard from "./MangaCard";

type Manga = {
  id: string;
  title: string;
  cover: string;
  volume?: string;
  is_free?: boolean;
};

type Props = {
  items: Manga[];
};

export default function MangaGrid({ items }: Props) {
  return (
    <div className={styles.grid}>
      {items.map((manga) => (
        <MangaCard
          key={manga.id}
          id={manga.id}
          title={manga.title}
          cover={manga.cover}
          volume={manga.volume}
          isFree={manga.is_free}
        />
      ))}
    </div>
  );
}