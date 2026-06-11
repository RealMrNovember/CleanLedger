import { invoke } from "@tauri-apps/api/core";
import type {
  PrintDeliveryResult,
  ProductLabelData,
  ReceiptData,
  ThermalWidth,
} from "@cleanledger/shared/print";
import { buildThermalEscPosPayload } from "@cleanledger/shared/print";
import {
  getThermalPort,
  getThermalWidthProfile,
  thermalWidthToCss,
} from "@/lib/thermal-settings";
import { triggerBrowserPrint } from "@/lib/print-service";

export function applyThermalReceiptDomWidth(
  element: HTMLElement | null,
  profile = getThermalWidthProfile()
): void {
  if (!element) return;
  const cssWidth = thermalWidthToCss(profile);
  element.dataset.thermalWidth = profile;
  element.style.width = `${profile === "58" ? 220 : 300}px`;
  element.style.maxWidth = cssWidth;
}

async function tryNativeEscPos(data: Uint8Array): Promise<PrintDeliveryResult> {
  const port = getThermalPort();
  try {
    const usedPort = await invoke<string>("print_escpos", {
      data: Array.from(data),
      port: port || null,
    });
    return {
      method: "escpos",
      success: true,
      message: usedPort ? `Yazici: ${usedPort}` : undefined,
    };
  } catch (err) {
    return {
      method: "escpos",
      success: false,
      message:
        err instanceof Error ? err.message : "Native ESC/POS yazdirma basarisiz.",
    };
  }
}

export async function printThermalCustomerReceipt(
  receipt: ReceiptData,
  options?: { preferEscPos?: boolean }
): Promise<PrintDeliveryResult> {
  const profile = getThermalWidthProfile();
  const width: ThermalWidth = thermalWidthToCss(profile);
  const payload = buildThermalEscPosPayload({ width, receipt });

  if (payload && options?.preferEscPos !== false) {
    const escpos = await tryNativeEscPos(payload);
    if (escpos.success) return escpos;
  }

  triggerBrowserPrint();
  return {
    method: "browser",
    success: true,
    message: "Sistem yazdirma penceresi acildi.",
  };
}

export async function printThermalProductLabels(
  labels: ProductLabelData[],
  options?: { preferEscPos?: boolean }
): Promise<PrintDeliveryResult> {
  const profile = getThermalWidthProfile();
  const width: ThermalWidth = thermalWidthToCss(profile);
  const payload = buildThermalEscPosPayload({ width, labels });

  if (payload && options?.preferEscPos !== false) {
    const escpos = await tryNativeEscPos(payload);
    if (escpos.success) return escpos;
  }

  triggerBrowserPrint();
  return {
    method: "browser",
    success: true,
    message: "Urun etiketleri yazdirma penceresine gonderildi.",
  };
}
