const PATHS = {
  home: ["M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"],
  package: ["M21 8 12 3 3 8v8l9 5 9-5z", "m3 8 9 5 9-5", "M12 13v8"],
  receipt: ["M6 3h12v18l-3-2-3 2-3-2-3 2z", "M9 8h6", "M9 12h6"],
  download: ["M12 3v12", "m7 10 5 5 5-5", "M4 19h16"],
  undo: ["M9 14 4 9l5-5", "M4 9h10a6 6 0 0 1 0 12h-3"],
  chart: ["M5 20V11", "M12 20V4", "M19 20v-6"],
  sliders: ["M4 6h9", "M17 6h3", "M4 12h3", "M11 12h9", "M4 18h11", "M19 18h1", "M13 4v4", "M9 10v4", "M17 16v4"],
  plus: ["M12 5v14", "M5 12h14"],
  file: ["M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z", "M14 3v5h5", "M9 13h6", "M9 17h6"],
  search: ["M4 11a7 7 0 1 0 14 0 7 7 0 1 0-14 0", "m20 20-3.5-3.5"],
  sun: ["M8 12a4 4 0 1 0 8 0 4 4 0 1 0-8 0", "M12 2v2", "M12 20v2", "m4.9 4.9 1.4 1.4", "m17.7 17.7 1.4 1.4", "M2 12h2", "M20 12h2", "m4.9 19.1 1.4-1.4", "m17.7 6.3 1.4-1.4"],
  moon: ["M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"],
  monitor: ["M3 4h18v12H3z", "M8 20h8", "M12 16v4"],
  maximize: ["M8 3H5a2 2 0 0 0-2 2v3", "M21 8V5a2 2 0 0 0-2-2h-3", "M3 16v3a2 2 0 0 0 2 2h3", "M16 21h3a2 2 0 0 0 2-2v-3"],
  minimize: ["M8 3v3a2 2 0 0 1-2 2H3", "M21 8h-3a2 2 0 0 1-2-2V3", "M3 16h3a2 2 0 0 1 2 2v3", "M16 21v-3a2 2 0 0 1 2-2h3"],
  logout: ["M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", "m16 17 5-5-5-5", "M21 12H9"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  check: ["m5 12 5 5L20 7"],
  alert: ["M12 9v4", "M12 17h.01", "M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"],
  info: ["M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0", "M12 11v5", "M12 8h.01"],
  lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 0 1 8 0v4"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z", "M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0"],
  eyeOff: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z", "M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0", "m3 3 18 18"],
  chevronRight: ["m9 6 6 6-6 6"],
  printer: ["M6 9V3h12v6", "M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2", "M6 14h12v7H6z"],
  share: ["M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7", "m16 6-4-4-4 4", "M12 2v13"],
};

export default function Icon({ name, size = 22, strokeWidth = 1.75, className = "" }) {
  const paths = PATHS[name];
  if (!paths) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`shrink-0 ${className}`}
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
