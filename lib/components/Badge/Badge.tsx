import styles from "./Badge.module.css";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "purple" | "blue" | "yellow" | "green" | "red" | "gray";
}

export default function Badge({ children, variant = "blue" }: BadgeProps) {
  const variantClass = {
    purple: styles.badgePurple,
    blue: styles.badgeBlue,
    yellow: styles.badgeYellow,
    green: styles.badgeGreen,
    red: styles.badgeRed,
    gray: styles.badgeGray,
  }[variant];

  return (
    <span className={`${styles.badge} ${variantClass}`}>
      {children}
    </span>
  );
}
