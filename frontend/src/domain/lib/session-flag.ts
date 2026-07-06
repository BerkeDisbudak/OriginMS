export function hasSessionFlag(key: string): boolean {
  return sessionStorage.getItem(key) === "true";
}

export function setSessionFlag(key: string): void {
  sessionStorage.setItem(key, "true");
}
