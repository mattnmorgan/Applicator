import styles from './Row.module.css';

interface RowProps {
  children: React.ReactNode;
  onClick?: () => void;
}

export default function Row({ children, onClick }: RowProps) {
  return (
    <div className={styles.row} onClick={onClick}>
      {children}
    </div>
  );
}
