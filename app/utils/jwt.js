function decodePayload(token) {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
}

export function decodeExp(token) {
  try {
    return decodePayload(token).exp;
  } catch {
    throw new Error('Failed to decode JWT token');
  }
}

export function decodeUserId(token) {
  try {
    return decodePayload(token).user_id ?? null;
  } catch {
    return null;
  }
}

export function now() {
  return Math.floor(Date.now() / 1000);
}
