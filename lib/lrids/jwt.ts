import { SignJWT, jwtVerify } from "jose";

const LRIDS_JWT_TYP = "lrids";

function getSecretBytes(): Uint8Array | null {
  const s = process.env.LRIDS_TOKEN_SECRET?.trim();
  if (!s || s.length < 16) return null;
  return new TextEncoder().encode(s);
}

export function isLridsJwtConfigured(): boolean {
  return getSecretBytes() !== null;
}

export async function signLridsToken(facilityId: string): Promise<string | null> {
  const secret = getSecretBytes();
  if (!secret) return null;

  return new SignJWT({ typ: LRIDS_JWT_TYP })
    .setSubject(facilityId)
    .setIssuedAt()
    .setExpirationTime("24h")
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);
}

export async function verifyLridsToken(
  token: string,
  expectedFacilityId: string
): Promise<boolean> {
  const secret = getSecretBytes();
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
    if (payload.typ !== LRIDS_JWT_TYP) return false;
    if (typeof payload.sub !== "string" || payload.sub !== expectedFacilityId) return false;
    return true;
  } catch {
    return false;
  }
}
