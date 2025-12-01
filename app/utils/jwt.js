export function decodeExp(token) {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    );
    return decoded.exp;
  } catch (error) {
    throw new Error('Failed to decode JWT token');
  }
}

export function now() {
  return Math.floor(Date.now() / 1000);
}
