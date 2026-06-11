import type { LicensePlatform } from "./types";

export interface LicenseRequestContext {
  email?: string;
  clientName?: string;
  deviceName?: string;
  platform?: LicensePlatform;
}

export function buildLicenseRequestBody(
  appCode: string,
  hwid: string,
  context?: LicenseRequestContext,
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    app_code: appCode,
    hwid,
    ...extra,
  };

  const email = context?.email?.trim().toLowerCase();
  if (email) body.email = email;
  if (context?.clientName?.trim()) body.client_name = context.clientName.trim();
  if (context?.deviceName?.trim()) body.device_name = context.deviceName.trim();
  if (context?.platform) body.platform = context.platform;

  return body;
}
