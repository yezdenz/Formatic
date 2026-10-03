export function canModerate(user: { role: string } | null | undefined): boolean {
  return user?.role === 'ADMIN' || user?.role === 'MOD';
}
