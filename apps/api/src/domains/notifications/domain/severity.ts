export const SEVERITIES = ["info", "success", "warning", "alert"] as const;
export type Severity = (typeof SEVERITIES)[number];

export function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value);
}
