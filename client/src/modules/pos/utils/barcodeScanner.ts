import type {
  ScanResult,
  BarcodeFormat,
  ScanMode,
  HIDScannerEvent,
  KeyboardWedgeConfig,
} from "@/modules/pos/types";

type ScanCallback = (result: ScanResult) => void;
type ErrorCallback = (error: string) => void;

interface BarcodeDetectorAPI {
  new (): {
    detect(image: VideoFrame | ImageBitmap | HTMLVideoElement): Promise<
      Array<{
        rawValue: string;
        format: string;
        boundingBox: DOMRectReadOnly;
        cornerPoints: Array<{ x: number; y: number }>;
      }>
    >;
  };
}

interface ScannerOptions {
  onScan: ScanCallback;
  onError?: ErrorCallback;
  mode?: ScanMode;
  formats?: BarcodeFormat[];
  cameraFacing?: "environment" | "user";
  torchEnabled?: boolean;
  scanInterval?: number;
  hideAfterScan?: boolean;
  keyboardWedge?: KeyboardWedgeConfig;
}

class BarcodeScannerService {
  private videoRef: HTMLVideoElement | null = null;
  private streamRef: MediaStream | null = null;
  private rafRef: number | null = null;
  private detector: any = null;
  private isScanning = false;
  private options: ScannerOptions;
  private hidBuffer = "";
  private hidTimeout: ReturnType<typeof setTimeout> | null = null;
  private lastScanTime = 0;
  private scanCooldown = 500;
  private keyboardWedgeConfig: KeyboardWedgeConfig = {
    enabled: true,
    prefix: "",
    suffix: "Enter",
    minLength: 8,
    maxLength: 50,
    allowedChars: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-",
    debounceMs: 50,
  };

  constructor(options: ScannerOptions) {
    this.options = options;
    this.keyboardWedgeConfig = {
      ...this.keyboardWedgeConfig,
      ...options.keyboardWedge,
    };
    this.initHIDListener();
  }

  private initHIDListener() {
    if (typeof window === "undefined") return;

    document.addEventListener("keydown", this.handleKeyDown.bind(this));
    document.addEventListener("paste", this.handlePaste.bind(this));
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (!this.keyboardWedgeConfig.enabled) return;

    const activeElement = document.activeElement;
    const isInput =
      activeElement instanceof HTMLInputElement ||
      activeElement instanceof HTMLTextAreaElement ||
      activeElement?.getAttribute("contenteditable") === "true";

    if (isInput && this.options.mode !== "manual") return;

    const key = event.key;

    if (key === "Enter" || key === "Tab") {
      if (this.hidBuffer.length >= this.keyboardWedgeConfig.minLength) {
        event.preventDefault();
        this.processHIDInput(this.hidBuffer);
        this.hidBuffer = "";
      }
      return;
    }

    if (
      key.length === 1 &&
      this.keyboardWedgeConfig.allowedChars.includes(key.toUpperCase())
    ) {
      this.hidBuffer += key.toUpperCase();
      this.resetHIDTimeout();
    } else if (key === "Backspace") {
      this.hidBuffer = this.hidBuffer.slice(0, -1);
      this.resetHIDTimeout();
    }
  }

  private handlePaste(event: ClipboardEvent) {
    const text =
      event.clipboardData?.getData("text")?.trim().toUpperCase() || "";
    if (
      text.length >= this.keyboardWedgeConfig.minLength &&
      text.length <= this.keyboardWedgeConfig.maxLength
    ) {
      const isValid = [...text].every(c =>
        this.keyboardWedgeConfig.allowedChars.includes(c)
      );
      if (isValid) {
        event.preventDefault();
        this.processHIDInput(text);
      }
    }
  }

  private resetHIDTimeout() {
    if (this.hidTimeout) clearTimeout(this.hidTimeout);
    this.hidTimeout = setTimeout(() => {
      this.hidBuffer = "";
    }, this.keyboardWedgeConfig.debounceMs);
  }

  private processHIDInput(value: string) {
    const now = Date.now();
    if (now - this.lastScanTime < this.scanCooldown) return;
    this.lastScanTime = now;

    this.options.onScan({
      value,
      format: "code128",
      timestamp: now,
    });

    this.emitHIDEvent({ type: "hid_scan", value, timestamp: now });
  }

  private emitHIDEvent(event: HIDScannerEvent) {
    window.dispatchEvent(new CustomEvent("pos:hid_scan", { detail: event }));
  }

  async startCameraScanner(videoElement: HTMLVideoElement): Promise<boolean> {
    if (this.isScanning) return true;

    const BarcodeDetector =
      (window as any).BarcodeDetector || (window as any).BarcodeDetectorAPI;
    if (!BarcodeDetector) {
      this.options.onError?.(
        "BarcodeDetector API not supported. Use HID scanner or manual input."
      );
      return false;
    }

    try {
      this.videoRef = videoElement;
      const formats = this.options.formats || [
        "ean_13",
        "ean_8",
        "upc_a",
        "upc_e",
        "code_128",
        "code_39",
        "qr_code",
        "data_matrix",
        "pdf417",
        "aztec",
      ];

      this.detector = new BarcodeDetector({ formats });

      this.streamRef = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: this.options.cameraFacing || "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      videoElement.srcObject = this.streamRef;
      await videoElement.play();

      this.isScanning = true;
      this.scanLoop();
      return true;
    } catch (error: any) {
      this.options.onError?.(`Camera access failed: ${error.message}`);
      this.stopCameraScanner();
      return false;
    }
  }

  stopCameraScanner() {
    this.isScanning = false;
    if (this.rafRef) {
      cancelAnimationFrame(this.rafRef);
      this.rafRef = null;
    }
    this.streamRef?.getTracks().forEach(track => track.stop());
    this.streamRef = null;
    if (this.videoRef) {
      this.videoRef.srcObject = null;
      this.videoRef = null;
    }
  }

  private async scanLoop() {
    if (!this.isScanning || !this.videoRef || !this.detector) return;

    try {
      if (this.videoRef.readyState >= 2) {
        const barcodes = await this.detector.detect(this.videoRef);
        if (barcodes && barcodes.length > 0) {
          const barcode = barcodes[0];
          const now = Date.now();

          if (now - this.lastScanTime >= this.scanCooldown) {
            this.lastScanTime = now;
            this.options.onScan({
              value: barcode.rawValue,
              format: this.mapFormat(barcode.format),
              timestamp: now,
              confidence: 1,
            });
          }
        }
      }
    } catch {
      // Scan frames fail routinely on blurry feeds — expected, stay silent.
    }

    if (this.isScanning) {
      this.rafRef = requestAnimationFrame(() => this.scanLoop());
    }
  }

  private mapFormat(format: string): BarcodeFormat {
    const formatMap: Record<string, BarcodeFormat> = {
      ean_13: "ean13",
      ean_8: "ean8",
      upc_a: "upc",
      upc_e: "upc",
      code_128: "code128",
      code_39: "code39",
      qr_code: "qr",
      data_matrix: "datamatrix",
      pdf417: "pdf417",
      aztec: "aztec",
    };
    return formatMap[format] || "code128";
  }

  async toggleTorch(enabled: boolean): Promise<boolean> {
    if (!this.streamRef) return false;
    try {
      const track = this.streamRef.getVideoTracks()[0];
      if (track && "applyConstraints" in track) {
        await track.applyConstraints({
          advanced: [{ torch: enabled } as MediaTrackConstraintSet],
        });
        return true;
      }
    } catch (error) {
      console.warn("Torch not supported:", error);
    }
    return false;
  }

  setMode(mode: ScanMode) {
    this.options.mode = mode;
  }

  getMode(): ScanMode {
    return this.options.mode || "camera";
  }

  setFormats(formats: BarcodeFormat[]) {
    this.options.formats = formats;
    if (this.detector) {
      const apiFormats = formats.map(f => this.reverseMapFormat(f));
      this.detector = new (window as any).BarcodeDetector({
        formats: apiFormats,
      });
    }
  }

  private reverseMapFormat(format: BarcodeFormat): string {
    const map: Record<BarcodeFormat, string> = {
      ean13: "ean_13",
      ean8: "ean_8",
      upc: "upc_a",
      code128: "code_128",
      code39: "code_39",
      qr: "qr_code",
      datamatrix: "data_matrix",
      pdf417: "pdf417",
      aztec: "aztec",
    };
    return map[format] || "code_128";
  }

  destroy() {
    this.stopCameraScanner();
    document.removeEventListener("keydown", this.handleKeyDown.bind(this));
    document.removeEventListener("paste", this.handlePaste.bind(this));
    if (this.hidTimeout) clearTimeout(this.hidTimeout);
  }

  static isSupported(): boolean {
    return (
      !!(window as any).BarcodeDetector ||
      !!navigator.mediaDevices?.getUserMedia
    );
  }

  static getSupportedFormats(): BarcodeFormat[] {
    return [
      "ean13",
      "ean8",
      "upc",
      "code128",
      "code39",
      "qr",
      "datamatrix",
      "pdf417",
      "aztec",
    ];
  }
}

export function createBarcodeScanner(options: ScannerOptions) {
  return new BarcodeScannerService(options);
}

export function useBarcodeScanner(options: ScannerOptions) {
  const scannerRef = { current: null as BarcodeScannerService | null };

  const start = async (videoElement: HTMLVideoElement) => {
    if (!scannerRef.current) {
      scannerRef.current = createBarcodeScanner(options);
    }
    return scannerRef.current.startCameraScanner(videoElement);
  };

  const stop = () => {
    scannerRef.current?.stopCameraScanner();
  };

  const destroy = () => {
    scannerRef.current?.destroy();
    scannerRef.current = null;
  };

  const setMode = (mode: ScanMode) => {
    scannerRef.current?.setMode(mode);
  };

  const setFormats = (formats: BarcodeFormat[]) => {
    scannerRef.current?.setFormats(formats);
  };

  const toggleTorch = (enabled: boolean) => {
    return scannerRef.current?.toggleTorch(enabled);
  };

  return { start, stop, destroy, setMode, setFormats, toggleTorch };
}

export function parseBarcodeValue(value: string): {
  type: "ean13" | "ean8" | "upc" | "isbn" | "gs1" | "custom";
  data: string;
  checkDigit?: number;
  countryCode?: string;
  manufacturerCode?: string;
  productCode?: string;
} {
  const cleaned = value.replace(/[^0-9]/g, "");

  if (cleaned.length === 13 && /^[0-9]{13}$/.test(cleaned)) {
    const checkDigit = calculateEAN13CheckDigit(cleaned.slice(0, 12));
    return {
      type: "ean13",
      data: cleaned,
      checkDigit,
      countryCode: cleaned.slice(0, 3),
      manufacturerCode: cleaned.slice(3, 8),
      productCode: cleaned.slice(8, 12),
    };
  }

  if (cleaned.length === 8 && /^[0-9]{8}$/.test(cleaned)) {
    return {
      type: "ean8",
      data: cleaned,
      checkDigit: parseInt(cleaned[7]),
      productCode: cleaned.slice(0, 7),
    };
  }

  if (cleaned.length === 12 && /^[0-9]{12}$/.test(cleaned)) {
    return {
      type: "upc",
      data: cleaned,
      checkDigit: calculateUPCCheckDigit(cleaned.slice(0, 11)),
      manufacturerCode: cleaned.slice(1, 6),
      productCode: cleaned.slice(6, 11),
    };
  }

  if (cleaned.length === 13 && cleaned.startsWith("978")) {
    return {
      type: "isbn",
      data: cleaned,
      checkDigit: calculateEAN13CheckDigit(cleaned.slice(0, 12)),
    };
  }

  if (cleaned.startsWith("01") && cleaned.length >= 16) {
    return {
      type: "gs1",
      data: cleaned,
    };
  }

  return { type: "custom", data: value };
}

function calculateEAN13CheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return (10 - (sum % 10)) % 10;
}

function calculateUPCCheckDigit(digits: string): number {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function validateBarcode(
  value: string,
  format?: BarcodeFormat
): boolean {
  const cleaned = value.replace(/[^0-9]/g, "");

  switch (format) {
    case "ean13":
      return (
        cleaned.length === 13 &&
        parseInt(cleaned[12]) === calculateEAN13CheckDigit(cleaned.slice(0, 12))
      );
    case "ean8":
      return cleaned.length === 8;
    case "upc":
      return (
        cleaned.length === 12 &&
        parseInt(cleaned[11]) === calculateUPCCheckDigit(cleaned.slice(0, 11))
      );
    default:
      return cleaned.length >= 8 && cleaned.length <= 50;
  }
}

export function generateBarcode(
  value: string,
  format: BarcodeFormat = "code128"
): string {
  switch (format) {
    case "ean13":
      if (value.length === 12) return value + calculateEAN13CheckDigit(value);
      return value;
    case "upc":
      if (value.length === 11) return value + calculateUPCCheckDigit(value);
      return value;
    default:
      return value;
  }
}
