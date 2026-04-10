export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  return secret && secret.trim().length > 0 ? secret : null;
}

export function getJwtKey() {
  const secret = getJwtSecret();
  return secret ? new TextEncoder().encode(secret) : null;
}
