import type {
  PrintDeliveryResult,
  ProductLabelData,
  ReceiptData,
  ThermalWidth,
} from "@cleanledger/shared/print";
import { buildThermalEscPosPayload } from "@cleanledger/shared/print";
import {
  getThermalWidthProfile,
  thermalWidthToCss,
} from "@/lib/thermal-settings";
import { triggerBrowserPrint } from "@/lib/print-service";

type SerialPortLike = {
  open: (options: { baudRate: number }) => Promise<void>;
  writable: WritableStream<Uint8Array> | null;
  close: () => Promise<void>;
};

type SerialNavigator = Navigator & {
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
  };
};

async function tryWebSerialEscPos(data: Uint8Array): Promise<PrintDeliveryResult> {
  const nav = navigator as SerialNavigator;
  if (!nav.serial) {
    return {
      method: "escpos",
      success: false,
      message: "Bu tarayıcı WebSerial desteklemiyor.",
    };
  }
  try {
    const port = await nav.serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable?.getWriter();
    if (!writer) {
      await port.close();
      return {
        method: "escpos",
        success: false,
        message: "Yazıcı bağlantısı kurulamadı.",
      };
    }
    await writer.write(data);
    writer.releaseLock();
    await port.close();
    return { method: "escpos", success: true };
  } catch (err) {
    return {
      method: "escpos",
      success: false,
      message:
        err instanceof Error ? err.message : "ESC/POS yazdırma iptal edildi.",
    };
  }
}

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

export async function printThermalCustomerReceipt(
  receipt: ReceiptData,
  options?: { preferEscPos?: boolean }
): Promise<PrintDeliveryResult> {
  const profile = getThermalWidthProfile();
  const width: ThermalWidth = thermalWidthToCss(profile);
  const payload = buildThermalEscPosPayload({ width, receipt });

  if (options?.preferEscPos && payload) {
    const escpos = await tryWebSerialEscPos(payload);
    if (escpos.success) return escpos;
  }

  triggerBrowserPrint();
  return {
    method: "browser",
    success: true,
    message: "Tarayıcı yazdırma penceresi açıldı.",
  };
}

export async function printThermalProductLabels(
  labels: ProductLabelData[],
  options?: { preferEscPos?: boolean }
): Promise<PrintDeliveryResult> {
  const profile = getThermalWidthProfile();
  const width: ThermalWidth = thermalWidthToCss(profile);
  const payload = buildThermalEscPosPayload({ width, labels });

  if (options?.preferEscPos && payload) {
    const escpos = await tryWebSerialEscPos(payload);
    if (escpos.success) return escpos;
  }

  triggerBrowserPrint();
  return {
    method: "browser",
    success: true,
    message: "Tarayıcı yazdırma penceresi açıldı.",
  };
}
