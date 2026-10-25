// Report page address for one tab's result: report.html?tab=<id>&origin=<origin>.

export function reportPath(tabId: number, origin: string): `/report.html${string}` {
  return `/report.html?${new URLSearchParams({ tab: String(tabId), origin })}`;
}

export function parseReportQuery(search: string): { tabId: number; origin: string } | null {
  const params = new URLSearchParams(search);
  const tabId = Number(params.get('tab'));
  const raw = params.get('origin') ?? '';
  if (!Number.isInteger(tabId) || tabId < 0) return null;
  try {
    const { origin, protocol } = new URL(raw);
    return origin === raw && (protocol === 'http:' || protocol === 'https:')
      ? { tabId, origin }
      : null;
  } catch {
    return null;
  }
}
