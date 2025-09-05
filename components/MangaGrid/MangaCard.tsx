import Link from "next/link";
import styles from "./MangaGrid.module.css";

type Props = {
  id: string;
  title: string;
  cover: string;
  volume?: string;
  isFree?: boolean;
};

export default function MangaCard({ id, title, cover, volume, isFree }: Props) {
  return (
    <Link href={`/manga/${id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        <img src={cover} alt={title} />
        {isFree && <span className={styles.labelFree}>無料</span>}
      </div>
      <div className={styles.info}>
        {volume && <span className={styles.volume}>{volume}</span>}
        <div className={styles.title}>{title}</div>
      </div>
    </Link>
  );
}