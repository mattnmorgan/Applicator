import Icon from "@/lib/components/utility/Icon";
import styles from "./Banner.module.css";

export type BannerVariant = "info" | "success" | "warning" | "error";

interface BannerProps {
  variant?: BannerVariant;
  children: React.ReactNode;
}

const ICON: Record<BannerVariant, React.ReactNode> = {
  info: <Icon name="info" size={16} />,
  success: <Icon name="check" size={16} />,
  warning: <Icon name="warning" size={16} />,
  error: <Icon name="error" size={16} />,
};

export default function Banner({ variant = "info", children }: BannerProps) {
  return (
    <div className={`${styles.banner} ${styles[variant]}`}>
      <span className={styles.icon}>{ICON[variant]}</span>
      <div className={styles.content}>{children}</div>
    </div>
  );
}
