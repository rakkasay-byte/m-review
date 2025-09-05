import Header from "./Header";
import Footer from "./Footer";
import styles from "./Layout.module.css";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "#fafafa" }}>
      <Header />
      <main className={styles.main}>{children}</main>
      <Footer />
    </div>
  );
}