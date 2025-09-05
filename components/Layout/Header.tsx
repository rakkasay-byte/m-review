import styles from "./Layout.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.logo}>漫画レビューサイト</div>
        <nav className={styles.nav}>
          <a href="#">マンガ一覧</a>
        </nav>
      </div>
    </header>
  );
}