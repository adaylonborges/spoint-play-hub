import spointLogo from "@/assets/spoint-logo.png";
import spointLogoWhite from "@/assets/spoint-logo-white.png";

export const SPOINT_APP_URL = "http://spoint.onelink.me/M200/spoint";

export function SpointLogo({
  variant = "dark",
  className = "h-8 w-auto",
}: {
  variant?: "dark" | "white";
  className?: string;
}) {
  const src = variant === "white" ? spointLogoWhite : spointLogo;
  return (
    <a
      href={SPOINT_APP_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Baixar o app Spoint"
      className="inline-flex items-center"
    >
      <img src={src} alt="Spoint" className={className} />
    </a>
  );
}
