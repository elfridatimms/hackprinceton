export function Portrait({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 80"
      fill="none"
      aria-hidden="true"
    >
      <path d="M17 43 7 27q14-2 24 16M59 43l14-19q4 18-9 28" fill="#7ba99a" />
      <path d="m25 25 0-14 12 12m14-2 9-12 3 18" fill="#ead49e" />
      <path
        d="M16 41c-1-19 12-24 25-23 19-3 28 8 27 25 0 20-11 28-27 28S15 61 16 41"
        fill="#efae80"
      />
      <ellipse cx="42" cy="57" rx="17" ry="12" fill="#f7dba9" />
      <ellipse cx="29" cy="39" rx="4" ry="6" fill="#284f46" />
      <ellipse cx="54" cy="39" rx="4" ry="6" fill="#284f46" />
      <circle cx="30" cy="37" r="1.5" fill="white" />
      <circle cx="55" cy="37" r="1.5" fill="white" />
      <ellipse cx="23" cy="49" rx="5" ry="3" fill="#e8947e" />
      <ellipse cx="61" cy="49" rx="5" ry="3" fill="#e8947e" />
      <path
        d="M36 50q6 6 12 0"
        stroke="#825d42"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function SeatIllustration({ small = false }: { small?: boolean }) {
  return (
    <svg
      viewBox="0 0 240 200"
      fill="none"
      aria-hidden="true"
      className={small ? "small-seat" : "seat-illustration"}
    >
      <ellipse cx="120" cy="182" rx="84" ry="9" fill="#dce5d1" />
      <path
        d="M83 107v60m0-40h68v40m-68-43V88"
        stroke="#8a9d7c"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M106 76v48h43l16 46"
        stroke="#4c7d6d"
        strokeWidth="20"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d="m105 80 20 25 35-28"
        stroke="#ecad83"
        strokeWidth="13"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="illustrated-arm"
      />
      <circle cx="108" cy="50" r="21" fill="#efb18b" />
      <path d="M85 44q-3-23 22-23t23 27q-12-14-24-10t-21 6" fill="#636f4e" />
      <path
        d="M95 82v37"
        stroke="#6e9c85"
        strokeWidth="30"
        strokeLinecap="round"
      />
      <path
        d="M99 170h22m38 6h22"
        stroke="#325d50"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <circle cx="121" cy="53" r="2" fill="#325d50" />
      <path
        d="m179 70 21-18m-13 26 23-1m-28-18 6-22"
        stroke="#d5b96f"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function TreeIllustration() {
  return (
    <svg viewBox="0 0 80 80" fill="none" aria-hidden="true">
      <path
        d="M41 66V32m0 17L25 34m16 8 17-18"
        stroke="#8c8e62"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path
        d="M17 39C-1 20 22 4 36 14 52-6 78 15 65 30c18 19-10 30-24 20-14 12-32 4-24-11"
        fill="#84a786"
      />
      <path
        d="M40 29v14m-18-6v11m36-21v12"
        stroke="#a2a16b"
        strokeWidth="1.5"
      />
      <ellipse cx="40" cy="47" rx="6" ry="7" fill="#f2ce7b" />
      <ellipse cx="22" cy="51" rx="4" ry="5" fill="#f2ce7b" />
      <ellipse cx="58" cy="42" rx="5" ry="6" fill="#f2ce7b" />
    </svg>
  );
}
