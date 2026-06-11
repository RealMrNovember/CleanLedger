export type { LicenseSnapshot, LicenseDeviceInfo, LicensePlatform } from "./types";
export { isLicenseUsable, isDeviceLimitError } from "./types";
export {
  type LicenseApiPayload,
  mapLicenseApiPayload,
  withLicenseLockReason,
  formatLicenseDeviceSummary,
  formatLicenseDeviceLabel,
} from "./api-mapper";
export {
  type LicenseRequestContext,
  buildLicenseRequestBody,
} from "./request";
export {
  type LicenseDisplay,
  isLifetimeLicense,
  getLicenseDisplay,
  formatLicenseDetail,
  licenseToneClasses,
} from "./display";
