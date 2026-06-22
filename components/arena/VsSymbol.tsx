/** VsSymbol — the gold "vs" glyph between the two cards (wireframe .vs-glyph). */
import styles from "./arena.module.css";

export function VsSymbol(): JSX.Element {
  return (
    <div className={styles.glyph} aria-hidden="true">
      vs
    </div>
  );
}
