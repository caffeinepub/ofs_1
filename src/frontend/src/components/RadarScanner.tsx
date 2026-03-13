import { motion } from "motion/react";

interface RadarDot {
  x: number; // -1 to 1
  y: number; // -1 to 1
  label: string;
  connected: boolean;
}

interface RadarScannerProps {
  dots?: RadarDot[];
  size?: number;
  onDotClick?: (label: string) => void;
}

export function RadarScanner({
  dots = [],
  size = 240,
  onDotClick,
}: RadarScannerProps) {
  const r = size / 2;
  const cx = r;
  const cy = r;

  return (
    <div className="relative select-none" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="absolute inset-0"
        aria-label="Radar scanner"
      >
        <title>Radar Scanner</title>
        {/* Grid circles */}
        {[0.25, 0.5, 0.75, 1].map((frac) => (
          <circle
            key={frac}
            cx={cx}
            cy={cy}
            r={r * frac - 1}
            fill="none"
            stroke="oklch(0.82 0.15 195 / 0.15)"
            strokeWidth={1}
          />
        ))}
        {/* Cross hairs */}
        <line
          x1={cx}
          y1={4}
          x2={cx}
          y2={size - 4}
          stroke="oklch(0.82 0.15 195 / 0.1)"
          strokeWidth={1}
        />
        <line
          x1={4}
          y1={cy}
          x2={size - 4}
          y2={cy}
          stroke="oklch(0.82 0.15 195 / 0.1)"
          strokeWidth={1}
        />

        {/* Radar sweep */}
        <g
          style={{
            transformOrigin: `${cx}px ${cy}px`,
            animation: "radar-rotate 3s linear infinite",
          }}
        >
          <defs>
            <radialGradient id="sweepGradient" cx="50%" cy="100%" r="100%">
              <stop
                offset="0%"
                stopColor="oklch(0.82 0.15 195)"
                stopOpacity="0"
              />
              <stop
                offset="100%"
                stopColor="oklch(0.82 0.15 195)"
                stopOpacity="0.6"
              />
            </radialGradient>
          </defs>
          <path
            d={`M ${cx} ${cy} L ${cx} ${4} A ${r - 4} ${r - 4} 0 0 1 ${cx + (r - 4) * Math.sin((60 * Math.PI) / 180)} ${cy - (r - 4) * Math.cos((60 * Math.PI) / 180)} Z`}
            fill="url(#sweepGradient)"
          />
          {/* Sweep leading edge line */}
          <line
            x1={cx}
            y1={cy}
            x2={cx}
            y2={4}
            stroke="oklch(0.82 0.15 195)"
            strokeWidth={2}
            opacity={0.9}
          />
        </g>

        {/* Center dot */}
        <circle cx={cx} cy={cy} r={4} fill="oklch(0.82 0.15 195)" />
        <circle cx={cx} cy={cy} r={8} fill="oklch(0.82 0.15 195 / 0.2)" />
      </svg>

      {/* Device dots */}
      {dots.map((dot, i) => {
        const px = cx + dot.x * (r - 24);
        const py = cy + dot.y * (r - 24);
        return (
          <motion.button
            key={dot.label}
            className="absolute flex flex-col items-center cursor-pointer"
            style={{ left: px - 8, top: py - 8 }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.15, type: "spring", stiffness: 300 }}
            onClick={() => onDotClick?.(dot.label)}
            aria-label={`Device: ${dot.label}`}
          >
            {/* Ping ring */}
            <div
              className="absolute rounded-full"
              style={{
                width: 24,
                height: 24,
                top: -4,
                left: -4,
                background: dot.connected
                  ? "oklch(0.78 0.18 145 / 0.3)"
                  : "oklch(0.82 0.15 195 / 0.3)",
                animation: "ping-slow 2s ease-out infinite",
                animationDelay: `${i * 0.4}s`,
              }}
            />
            <div
              className="w-4 h-4 rounded-full border-2 flex items-center justify-center"
              style={{
                background: dot.connected
                  ? "oklch(0.78 0.18 145)"
                  : "oklch(0.82 0.15 195)",
                borderColor: dot.connected
                  ? "oklch(0.9 0.12 145)"
                  : "oklch(0.95 0.08 195)",
                boxShadow: dot.connected
                  ? "0 0 10px oklch(0.78 0.18 145 / 0.8)"
                  : "0 0 10px oklch(0.82 0.15 195 / 0.8)",
              }}
            />
            <span
              className="absolute text-[9px] font-bold whitespace-nowrap"
              style={{
                top: 18,
                left: "50%",
                transform: "translateX(-50%)",
                color: dot.connected
                  ? "oklch(0.78 0.18 145)"
                  : "oklch(0.82 0.15 195)",
                textShadow: "0 1px 4px rgba(0,0,0,0.8)",
              }}
            >
              {dot.label.length > 8 ? `${dot.label.slice(0, 7)}…` : dot.label}
            </span>
          </motion.button>
        );
      })}

      {/* Outer glow ring */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          boxShadow:
            "inset 0 0 30px oklch(0.82 0.15 195 / 0.08), 0 0 30px oklch(0.82 0.15 195 / 0.1)",
          borderRadius: "50%",
        }}
      />
    </div>
  );
}
