export function logInfo(msg: string, extra?: any) {
  console.log(`[worker] ${msg}`, extra ?? "");
}

export function logWarn(msg: string, extra?: any) {
  console.warn(`[worker] ${msg}`, extra ?? "");
}

export function logError(msg: string, extra?: any) {
  console.error(`[worker] ${msg}`, extra ?? "");
}
