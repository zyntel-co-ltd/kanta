import { writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "../public/avatars");
mkdirSync(outDir, { recursive: true });

const palettes = {
  em: ["#065f46", "#059669", "#10b981", "#34d399"],
  te: ["#0f766e", "#0d9488", "#14b8a6", "#5eead4"],
  am: ["#b45309", "#d97706", "#f59e0b", "#fcd34d"],
  sl: ["#1e293b", "#334155", "#64748b", "#94a3b8"],
};

/** @type {readonly string[]} */
const bodies = [
  // 1–4 emerald / teal bases
  () => {
    const [a, b, c] = palettes.em;
    return `<defs><radialGradient id="g" cx="35%" cy="30%"><stop offset="0%" stop-color="${c}"/><stop offset="55%" stop-color="${b}"/><stop offset="100%" stop-color="${a}"/></radialGradient></defs><circle cx="32" cy="32" r="30" fill="url(#g)"/><circle cx="32" cy="32" r="22" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="2"/><circle cx="24" cy="26" r="4" fill="#fff" opacity=".9"/><circle cx="40" cy="38" r="3" fill="#fff" opacity=".55"/>`;
  },
  () => {
    const [a, b] = palettes.te;
    return `<rect width="64" height="64" fill="${a}"/><path d="M32 8l12 7v14l-12 7-12-7V15z" fill="${b}" opacity=".9"/><path d="M32 28l12 7v14l-12 7-12-7V35z" fill="#fff" opacity=".2"/>`;
  },
  () => {
    const [a, b, c] = palettes.am;
    return `<rect width="64" height="64" fill="${a}"/><path d="M0 12h64v8H0zm0 16h64v8H0zm0 16h64v8H0z" fill="${b}" opacity=".85"/><circle cx="32" cy="32" r="14" fill="none" stroke="${c}" stroke-width="3" opacity=".6"/>`;
  },
  () => {
    const [a, b, c] = palettes.sl;
    return `<rect width="64" height="64" fill="${a}"/><circle cx="32" cy="32" r="26" fill="${b}"/><circle cx="32" cy="32" r="18" fill="${c}" opacity=".4"/><circle cx="32" cy="32" r="10" fill="${a}"/>`;
  },
  // 5–8 splits & geometry
  () => {
    const [e, t] = [palettes.em[1], palettes.te[2]];
    return `<rect width="64" height="64" fill="${e}"/><path d="M64 0L0 64V0z" fill="${t}"/><circle cx="44" cy="20" r="8" fill="#fff" opacity=".25"/>`;
  },
  () => {
    const [a, b] = [palettes.am[1], palettes.te[0]];
    return `<rect width="64" height="64" fill="${a}"/><circle cx="20" cy="20" r="5" fill="${b}"/><circle cx="44" cy="22" r="5" fill="${b}"/><circle cx="32" cy="40" r="6" fill="${b}"/><circle cx="18" cy="48" r="4" fill="#fff" opacity=".35"/>`;
  },
  () => {
    const [a, b] = [palettes.em[0], palettes.em[3]];
    return `<defs><linearGradient id="g" x1="0" y1="0" x2="64" y2="64"><stop stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><path d="M32 10 L52 42 H12 Z" fill="#fff" opacity=".22"/>`;
  },
  () => {
    const [a, b, c] = palettes.sl;
    return `<rect width="64" height="64" fill="${a}"/><circle cx="22" cy="24" r="10" fill="${b}"/><circle cx="42" cy="28" r="8" fill="${c}"/><circle cx="32" cy="46" r="12" fill="${b}" opacity=".5"/>`;
  },
  // 9–12 patterns
  () => {
    const [a, b] = [palettes.te[1], palettes.em[2]];
    return `<rect width="64" height="64" fill="${a}"/><path d="M0 40 Q16 28 32 40T64 40v24H0z" fill="${b}" opacity=".7"/><path d="M0 48 Q32 36 64 48v16H0z" fill="#fff" opacity=".15"/>`;
  },
  () => {
    const [a, b] = [palettes.am[0], palettes.sl[2]];
    return `<rect width="64" height="64" fill="${a}"/><rect x="20" y="20" width="24" height="24" rx="3" transform="rotate(45 32 32)" fill="${b}" opacity=".85"/><circle cx="32" cy="32" r="6" fill="#fcd34d" opacity=".9"/>`;
  },
  () => {
    const [a, b, c] = palettes.em;
    return `<rect width="64" height="64" fill="${a}"/><path d="M32 4 A28 28 0 0 1 60 32 H32z" fill="${b}"/><path d="M4 32 A28 28 0 0 1 32 4v28z" fill="${c}" opacity=".75"/><path d="M32 32 A28 28 0 0 0 4 32h28z" fill="#fff" opacity=".12"/>`;
  },
  () => {
    const [a, b, t] = [palettes.sl[1], palettes.te[3], palettes.am[2]];
    return `<defs><linearGradient id="g" x1="0" y1="64" x2="64" y2="0"><stop stop-color="${a}"/><stop offset=".5" stop-color="${t}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="32" r="20" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="2" stroke-dasharray="6 4"/>`;
  },
  // 13–16 accents
  () => {
    const [a, b] = [palettes.te[0], palettes.am[1]];
    return `<rect width="64" height="64" fill="${a}"/><path d="M32 6 A26 26 0 1 1 31.9 6z" fill="none" stroke="${b}" stroke-width="6" stroke-dasharray="14 10"/><circle cx="32" cy="32" r="8" fill="#fff" opacity=".35"/>`;
  },
  () => {
    const [a, b, c] = palettes.sl;
    return `<rect width="64" height="64" fill="${a}"/><path d="M32 8 L54 48 H10z" fill="${b}" opacity=".9"/><path d="M32 20 L46 44 H18z" fill="${c}" opacity=".5"/>`;
  },
  () => {
    const [a, b] = [palettes.em[2], palettes.am[0]];
    return `<rect width="64" height="64" fill="${a}"/><circle cx="32" cy="32" r="24" fill="none" stroke="${b}" stroke-width="2" stroke-dasharray="3 6"/><circle cx="32" cy="32" r="16" fill="none" stroke="#fff" stroke-width="1.5" opacity=".4"/><circle cx="32" cy="32" r="6" fill="${b}" opacity=".8"/>`;
  },
  () => {
    const [a, e, t] = [palettes.sl[0], palettes.em[1], palettes.te[2]];
    return `<rect width="64" height="64" fill="${a}"/><path d="M8 16h48v6H8zm0 14h48v6H8zm0 14h48v6H8z" fill="${e}" opacity=".85"/><path d="M16 8v48h6V8zm14 0v48h6V8zm14 0v48h6V8z" fill="${t}" opacity=".5"/>`;
  },
];

for (let i = 0; i < 16; i++) {
  const n = String(i + 1).padStart(2, "0");
  const inner = bodies[i]();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="Default avatar ${n}">
  <clipPath id="c"><circle cx="32" cy="32" r="32"/></clipPath>
  <g clip-path="url(#c)">${inner}</g>
</svg>`;
  writeFileSync(join(outDir, `default-${n}.svg`), svg.trim(), "utf8");
}
console.log("Wrote 16 SVGs to public/avatars");
