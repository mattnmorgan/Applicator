import styles from "./Badge.module.css";

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "purple"
    | "blue"
    | "yellow"
    | "green"
    | "red"
    | "gray"
    | "cyan"
    | "pink"
    | "orange"
    | "emerald"
    | "amber";
  shape?: "circle" | "square";
  uppercase?: boolean;
}

export default function Badge({
  children,
  variant = "blue",
  shape = "circle",
  uppercase = false,
}: BadgeProps) {
  const variantClass = {
    purple: styles.badgePurple,
    blue: styles.badgeBlue,
    yellow: styles.badgeYellow,
    green: styles.badgeGreen,
    red: styles.badgeRed,
    gray: styles.badgeGray,
    cyan: styles.badgeCyan,
    pink: styles.badgePink,
    orange: styles.badgeOrange,
    emerald: styles.badgeEmerald,
    amber: styles.badgeAmber,
  }[variant];

  const shapeClass = shape === "square" ? styles.badgeSquare : styles.badgeCircle;
  const uppercaseClass = uppercase ? styles.badgeUppercase : "";

  return (
    <span
      className={`${styles.badge} ${variantClass} ${shapeClass} ${uppercaseClass}`}
    >
      {children}
    </span>
  );
}
