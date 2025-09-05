import styles from "./Layout.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.logo}>漫画レビューサイト</div>
      </div>
    </footer>
  );
}