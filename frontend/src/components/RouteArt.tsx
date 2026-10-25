/** Stylised mobility map: road grid, animated route lines, pickup pins and drop-off points. Purely decorative. */
export default function RouteArt() {
  return (
    <svg viewBox="0 0 520 380" className="w-full h-full" role="img" aria-label="Decorative map of city routes with pickup and drop-off points">
      <defs>
        <pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <path d="M26 0H0V26" fill="none" stroke="#34564B" strokeWidth="0.6" opacity="0.7" />
        </pattern>
        <radialGradient id="fade" cx="50%" cy="50%" r="60%">
          <stop offset="55%" stopColor="#0B211C" stopOpacity="0" />
          <stop offset="100%" stopColor="#0B211C" stopOpacity="0.95" />
        </radialGradient>
      </defs>
      <rect width="520" height="380" fill="#0F332C" />
      <rect width="520" height="380" fill="url(#grid)" />
      {/* arterial roads */}
      <g fill="none" stroke="#1F4A40" strokeWidth="9" strokeLinecap="round">
        <path d="M-10 250 C 120 230, 180 120, 300 140 S 470 90, 540 40" />
        <path d="M60 400 C 90 300, 200 280, 250 200 S 330 60, 380 -10" />
        <path d="M-10 120 C 100 150, 220 210, 330 250 S 470 330, 540 310" />
      </g>
      <g fill="none" stroke="#34564B" strokeWidth="1.2" strokeDasharray="3 7" strokeLinecap="round">
        <path d="M-10 250 C 120 230, 180 120, 300 140 S 470 90, 540 40" />
        <path d="M60 400 C 90 300, 200 280, 250 200 S 330 60, 380 -10" />
        <path d="M-10 120 C 100 150, 220 210, 330 250 S 470 330, 540 310" />
      </g>
      {/* ride routes */}
      <path className="route-anim" d="M70 262 C 130 232, 190 130, 300 140 S 420 110, 452 70" fill="none" stroke="#C7F464" strokeWidth="3" strokeLinecap="round" />
      <path className="route-anim" style={{ animationDuration: "8s" }} d="M96 330 C 130 280, 210 270, 250 200 S 320 80, 352 40" fill="none" stroke="#71C7D8" strokeWidth="3" strokeLinecap="round" />
      <path className="route-anim" style={{ animationDuration: "7s", animationDirection: "reverse" }} d="M54 140 C 130 160, 240 220, 330 250 S 430 310, 470 300" fill="none" stroke="#FF795E" strokeWidth="3" strokeLinecap="round" />
      {/* pickups */}
      {[[70, 262, "#C7F464"], [96, 330, "#71C7D8"], [54, 140, "#FF795E"]].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <circle r="13" fill={c as string} opacity="0.18" />
          <circle r="6" fill="#0B211C" stroke={c as string} strokeWidth="2.5" />
        </g>
      ))}
      {/* drop-offs */}
      {[[452, 70, "#C7F464"], [352, 40, "#71C7D8"], [470, 300, "#FF795E"]].map(([x, y, c], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <path d="M0 -16 C 8 -16, 11 -9, 11 -5 C 11 3, 0 12, 0 12 C 0 12, -11 3, -11 -5 C -11 -9, -8 -16, 0 -16 Z" fill={c as string} />
          <circle cy="-5" r="3.6" fill="#0B211C" />
        </g>
      ))}
      <circle cx="300" cy="140" r="4" fill="#FFC857" />
      <circle cx="250" cy="200" r="4" fill="#FFC857" />
      <circle cx="330" cy="250" r="4" fill="#FFC857" />
      <rect width="520" height="380" fill="url(#fade)" />
      <text x="16" y="364" fontFamily="JetBrains Mono, monospace" fontSize="10" fill="#A8BDB3" letterSpacing="1.5">ILLUSTRATIVE ROUTE MAP · NOT REAL COORDINATES</text>
    </svg>
  );
}
