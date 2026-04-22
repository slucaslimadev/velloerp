import Image from "next/image";

interface VelloLogoProps {
  /** Altura do ícone em px */
  iconSize?: number;
  /** Tamanho do título "VELLO" em px */
  titleSize?: number;
  /** Mostrar subtítulo "INTELIGÊNCIA ARTIFICIAL" */
  showSubtitle?: boolean;
  className?: string;
}

export function VelloLogo({
  iconSize = 42,
  titleSize = 26,
  showSubtitle = true,
  className = "",
}: VelloLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <Image
        src="/logo.png"
        alt="Vello Inteligência Artificial"
        width={iconSize}
        height={iconSize}
        className="flex-shrink-0"
        priority
      />
      <div className="flex flex-col justify-center">
        <span
          style={{
            fontFamily: "var(--ff-brand)",
            fontWeight: 700,
            fontSize: titleSize,
            letterSpacing: "0.05em",
            color: "var(--text-1)",
            lineHeight: 1,
          }}
        >
          VELLO
        </span>
        {showSubtitle && (
          <span
            style={{
              fontFamily: "var(--ff-brand)",
              fontWeight: 500,
              fontSize: 9,
              letterSpacing: "0.206em",
              color: "var(--text-2)",
              marginTop: 4,
              marginLeft: 2,
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            INTELIGÊNCIA ARTIFICIAL
          </span>
        )}
      </div>
    </div>
  );
}
