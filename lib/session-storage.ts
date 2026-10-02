const preferenceKey = "shadowfox-remember-me";
export function remembersSession() {
  return typeof window !== "undefined" && localStorage.getItem(preferenceKey) !== "false";
}
export function setRememberSession(remember: boolean) {
  localStorage.setItem(preferenceKey, String(remember));
}
// Keep unremembered sessions within this tab; retain compatibility with existing logins.
export const sessionStorageAdapter = {
  getItem(key: string) { return sessionStorage.getItem(key) ?? localStorage.getItem(key); },
  setItem(key: string, value: string) {
    const target = remembersSession() ? localStorage : sessionStorage;
    const other = remembersSession() ? sessionStorage : localStorage;
    target.setItem(key, value);
    other.removeItem(key);
  },
  removeItem(key: string) { sessionStorage.removeItem(key); localStorage.removeItem(key); },
};
