import styles from "../styles/Snow.module.scss";

const snowCount = 200;

export default function Snow() {
  return (
    <div>
      {Array.from({ length: snowCount }).map((_, i) => (
        <div key={i} className={styles.snow} />
      ))}
    </div>
  );
}
