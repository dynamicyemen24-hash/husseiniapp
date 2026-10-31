/**
 * Hardware Integration Layer for POS System
 * Supports: Printers, Cash Drawers, Barcode Scanners, Customer Displays, PIN Pads, Scales
 * Enterprise-grade hardware abstraction layer with WebHID, WebUSB, WebSerial, WebBluetooth APIs
 */

// ============================================
// CORE TYPES
// ============================================

/** DEV-only diagnostics logger — strips from production console output. */
const devLog = (...args: unknown[]): void => {
  if (import.meta.env?.DEV) console.warn("[hw]", ...args);
};

export interface HardwareDevice {
  id: string;
  type:
    | "printer"
    | "cash_drawer"
    | "barcode_scanner"
    | "customer_display"
    | "pin_pad"
    | "scale";
  name: string;
  vendorId?: number;
  productId?: number;
  connectionType: "usb" | "bluetooth" | "network" | "serial" | "hid";
  devicePath?: string;
  capabilities: DeviceCapabilities;
  status: "connected" | "disconnected" | "error" | "initializing";
  lastSeen: Date;
  firmwareVersion?: string;
  config: DeviceConfig;
}

export interface DeviceCapabilities {
  // Printer capabilities
  canPrintReceipt?: boolean;
  canPrintLabels?: boolean;
  canCutPaper?: boolean;
  printWidth?: number; // mm
  printSpeed?: number; // mm/s
  dpi?: number;

  // Cash drawer
  canOpenDrawer?: boolean;
  drawerSensors?: boolean;

  // Barcode scanner
  supportedSymbologies?: string[];
  canScanFromScreen?: boolean;

  // Customer display
  displayLines?: number;
  displayColumns?: number;
  canShowGraphics?: boolean;
  supportedEncodings?: string[];

  // PIN Pad
  supportedPaymentSchemes?: string[];
  pinEntrySupport?: boolean;
  contactlessSupport?: boolean;

  // Scale
  maxWeight?: number;
  precision?: number;
  units?: string[];

  // Common
  isNetworkDevice?: boolean;
  supportsEncryption?: boolean;
  firmwareUpdatable?: boolean;
}

export interface DeviceConfig {
  // Printer
  printerName?: string;
  paperSize?: "58mm" | "80mm" | "a4" | "label";
  printDensity?: number;
  autoCut?: boolean;
  headerText?: string;
  footerText?: string;
  logoBase64?: string;

  // Cash drawer
  drawerTrigger?: "printer" | "direct" | "network";
  drawerPin?: string;
  printerId?: string;

  // Network settings
  ipAddress?: string;
  port?: number;
  connectionType?: "usb" | "bluetooth" | "network" | "serial" | "hid";

  // Scanner
  scanMode: "trigger" | "continuous" | "presentation";
  beepEnabled: boolean;
  vibrationEnabled: boolean;
  prefix?: string;
  suffix?: string;

  // Customer display
  displayMode: "text" | "html" | "custom";
  brightness: number;
  timeout: number;
  showAds: boolean;
  adImages?: string[];

  // PIN Pad
  terminalId: string;
  merchantId: string;
  supportedCardSchemes: string[];
  contactlessLimit: number;

  // Scale
  defaultUnit: "kg" | "g" | "lb" | "oz";
  tareEnabled: boolean;
  autoZero: boolean;

  // Device identification (for creating from config)
  deviceType?: HardwareDevice["type"];
  name?: string;
  vendorId?: number;
  productId?: number;
  capabilities?: DeviceCapabilities;
}

export interface HardwareEvent {
  type: "connected" | "disconnected" | "error" | "data" | "status_change";
  deviceId: string;
  deviceType: string;
  timestamp: Date;
  data?: any;
  error?: string;
}

export interface PrintJob {
  id: string;
  type: "receipt" | "label" | "report" | "kitchen" | "kitchen_arabic";
  content: PrintContent;
  printerId?: string;
  copies: number;
  priority: "low" | "normal" | "high" | "urgent";
  options: PrintOptions;
  createdAt: Date;
  status: "pending" | "printing" | "completed" | "failed";
  completedAt?: Date;
  error?: string;
}

export interface PrintContent {
  type: "receipt" | "label" | "kitchen" | "report" | "custom";
  data: any;
  template?: string;
  templateData?: Record<string, any>;
}

export interface PrintOptions {
  copies: number;
  cutPaper: boolean;
  header?: string;
  footer?: string;
  logoBase64?: string;
  width?: number; // mm
  quality: "draft" | "normal" | "high";
  encoding: "utf-8" | "cp864" | "cp1256";
}

export interface CashDrawerEvent {
  type: "open" | "close" | "status_changed" | "error";
  drawerId: string;
  timestamp: Date;
  expectedAmount?: number;
  actualAmount?: number;
  discrepancy?: number;
  userId: string;
  reason?: string;
  error?: string;
}

export interface BarcodeScanResult {
  value: string;
  format: string;
  timestamp: Date;
  scannerId: string;
  rawData?: string;
  confidence?: number;
}

export interface CustomerDisplayMessage {
  type:
    | "welcome"
    | "item_added"
    | "subtotal"
    | "total"
    | "payment"
    | "change"
    | "thank_you"
    | "custom"
    | "advertisement";
  lines: string[];
  amount?: number;
  currency?: string;
  duration?: number;
  alignment?: "left" | "center" | "right";
  fontSize?: "small" | "medium" | "large";
  showLogo?: boolean;
  logoBase64?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface PaymentTerminalEvent {
  type:
    | "transaction_started"
    | "card_inserted"
    | "pin_entry"
    | "contactless_tap"
    | "processing"
    | "approved"
    | "declined"
    | "cancelled"
    | "error"
    | "timeout";
  terminalId: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  cardType?: string;
  maskedPan?: string;
  authCode?: string;
  referenceNumber?: string;
  receiptData?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}

export interface ScaleReading {
  weight: number;
  unit: string;
  stable: boolean;
  overload: boolean;
  underload: boolean;
  timestamp: Date;
  deviceId: string;
  tareWeight?: number;
}

export interface OfflineQueueItem {
  id: string;
  type: string;
  payload: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

export interface DeviceManagerEvents {
  onDeviceConnected: (device: HardwareDevice) => void;
  onDeviceDisconnected: (deviceId: string) => void;
  onDeviceError: (deviceId: string, error: string) => void;
  onPrintJobStatus: (
    jobId: string,
    status: PrintJob["status"],
    error?: string
  ) => void;
  onPrintJobProgress: (jobId: string, progress: number) => void;
  onCashDrawerEvent: (event: CashDrawerEvent) => void;
  onBarcodeScan: (result: BarcodeScanResult) => void;
  onCustomerDisplayUpdate: (message: CustomerDisplayMessage) => void;
  onPaymentTerminalEvent: (event: PaymentTerminalEvent) => void;
  onScaleReading: (reading: ScaleReading) => void;
  onDeviceStatusChange: (
    deviceId: string,
    status: HardwareDevice["status"]
  ) => void;
}

export class HardwareManager {
  private devices: Map<string, HardwareDevice> = new Map();
  private eventHandlers: Partial<DeviceManagerEvents> = {};
  private printQueue: PrintJob[] = [];
  private isProcessingQueue = false;
  private deviceWatchers: Map<string, any> = new Map();
  private reconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  private config: Map<string, DeviceConfig> = new Map();

  // Printer implementations
  private printers: Map<string, PrinterDriver> = new Map();
  private cashDrawers: Map<string, CashDrawerDriver> = new Map();
  private scanners: Map<string, BarcodeScannerDriver> = new Map();
  private displays: Map<string, CustomerDisplayDriver> = new Map();
  private pinPads: Map<string, PinPadDriver> = new Map();
  private scales: Map<string, ScaleDriver> = new Map();

  constructor() {
    this.initializeDrivers();
  }

  // ============================================
  // INLINE PLACEHOLDER DRIVER IMPLEMENTATIONS
  // ============================================

  private initializeDrivers() {
    // Generic ESC/POS Printer Driver
    class GenericESCPOSPrinterDriver implements PrinterDriver {
      async connect(device: HardwareDevice): Promise<void> {
        devLog("Connecting to printer:", device.name);
      }
      async disconnect(device: HardwareDevice): Promise<void> {}
      async print(job: PrintJob, device: HardwareDevice): Promise<void> {
        // Build ESC/POS commands and transmit the raw bytes to the device.
        const data = this.buildReceiptData(job);
        await this.printRaw(device, data);
      }
      async printRaw(device: HardwareDevice, data: Uint8Array): Promise<void> {
        // Physical transmission is delegated to the concrete transport driver
        // (network / WebUSB). The generic driver cannot reach the hardware on
        // its own; subclasses override printRaw to actually send the bytes.
        const drv = this.constructor.name as string;
        console.warn(
          `[${drv}] No transport found for "${device.name}" — configure a network printer (IP:port) or pair via WebUSB.`
        );
      }
      async getStatus(device: HardwareDevice): Promise<PrinterStatus> {
        return {
          online: true,
          paperStatus: "ok",
          coverOpen: false,
          paperJam: false,
        };
      }
      async supportsReceiptPrinting(): Promise<boolean> {
        return true;
      }
      supportsLabelPrinting(): boolean {
        return false;
      }
      getSupportedPaperSizes(): string[] {
        return ["58mm", "80mm"];
      }

      private buildReceiptData(job: PrintJob): Uint8Array {
        const ESC = 0x1b;
        const GS = 0x1d;
        const commands: number[] = [
          ESC,
          0x40, // Init
          ESC,
          0x61,
          0x01, // Center align
        ];
        // Add header
        if (job.options.header) {
          commands.push(...new TextEncoder().encode(job.options.header + "\n"));
        }
        // Add items
        if (job.content.data.items) {
          for (const item of job.content.data.items) {
            commands.push(
              ...new TextEncoder().encode(
                `${item.productName} x${item.quantity} ${item.unitPrice}\n`
              )
            );
          }
        }
        // Add total
        if (job.content.data.totals) {
          commands.push(ESC, 0x45, 0x01); // Bold on
          commands.push(
            ...new TextEncoder().encode(
              `Total: ${job.content.data.totals.total}\n`
            )
          );
          commands.push(ESC, 0x45, 0x00); // Bold off
        }
        // Add footer
        if (job.options.footer) {
          commands.push(
            ...new TextEncoder().encode("\n" + job.options.footer + "\n")
          );
        }
        // Cut paper
        if (job.options.cutPaper) {
          commands.push(GS, 0x56, 0x00);
        }
        return new Uint8Array(commands);
      }
    }

    // Network Printer Driver
    class NetworkPrinterDriver extends GenericESCPOSPrinterDriver {
      async printRaw(device: HardwareDevice, data: Uint8Array): Promise<void> {
        const ip = device.config.ipAddress;
        const port = device.config.port || 9100;
        if (!ip) return;
        // Prefer an explicit raw-socket HTTP bridge, else fall back to the
        // printer's HTTP write endpoint. Browsers cannot open raw TCP (9100),
        // so we transmit through an HTTP bridge that forwards the ESC/POS
        // bytes to the printer socket. The /print endpoint is the documented
        // local-bridge contract.
        const bridge =
          (device.config as any).bridgeUrl || `http://${ip}:${port}`;
        const res = await fetch(`${bridge}/print`, {
          method: "POST",
          body: data as unknown as BodyInit,
          headers: { "Content-Type": "application/octet-stream" },
        });
        if (!res.ok) {
          throw new Error(`Network print failed: HTTP ${res.status}`);
        }
      }
    }

    // WebUSB Printer Driver
    class WebUSBPrinterDriver extends GenericESCPOSPrinterDriver {
      async printRaw(device: HardwareDevice, data: Uint8Array): Promise<void> {
        if (!("usb" in navigator)) return;
        const navUsb = (navigator as any).usb;
        try {
          let usbDevice = null;
          const all = await navUsb.getDevices();
          usbDevice =
            (all || []).find(
              (d: any) => d.serialNumber === device.devicePath
            ) || null;
          if (!usbDevice && (device as any).usbDevice) {
            usbDevice = (device as any).usbDevice;
          }
          if (!usbDevice) return;
          await usbDevice.open();
          await usbDevice.selectConfiguration(1);
          const iface = usbDevice.configuration?.interfaces?.[0];
          if (iface && !(iface.claimed || iface.isClaimed)) {
            await usbDevice.claimInterface(iface.interfaceNumber ?? 0);
          }
          const ep = iface?.alternate?.endpoints?.find(
            (e: any) => e.direction === "out"
          );
          await usbDevice.transferOut(ep?.endpointNumber ?? 1, data);
          await usbDevice.close();
        } catch (e) {
          console.error("WebUSB print failed:", e);
          throw e;
        }
      }
    }

    // Cash Drawer Drivers
    class GenericCashDrawerDriver implements CashDrawerDriver {
      async connect(device: HardwareDevice): Promise<void> {}
      async disconnect(device: HardwareDevice): Promise<void> {}
      async openDrawer(device: HardwareDevice): Promise<void> {
        devLog("Opening cash drawer:", device.name);
        // Send drawer kick command (ESC/POS: ESC p 0 25 250)
        const ESC = 0x1b;
        const kickCommand = new Uint8Array([ESC, 0x70, 0x00, 25, 250]);
        // For printer-port connected drawers, the printer driver should handle this
        // This is a simplified implementation
      }
      async closeDrawer(device: HardwareDevice): Promise<void> {}
      async getDrawerStatus(device: HardwareDevice): Promise<CashDrawerStatus> {
        return { open: false, locked: false, sensorWorking: true };
      }
      async getCashAmount?(device: HardwareDevice): Promise<number> {
        return 0;
      }
    }

    class PrinterPortCashDrawerDriver extends GenericCashDrawerDriver {}
    class NetworkCashDrawerDriver extends GenericCashDrawerDriver {}

    // Barcode Scanner Drivers
    class GenericBarcodeScannerDriver implements BarcodeScannerDriver {
      private scanHandler?: (result: BarcodeScanResult) => void;

      async connect(device: HardwareDevice): Promise<void> {}
      async disconnect(device: HardwareDevice): Promise<void> {}
      async startScanning(
        device: HardwareDevice,
        options?: ScanOptions
      ): Promise<void> {
        devLog("Starting barcode scanner:", device.name);
        // For HID scanners, they act as keyboard input
        // For camera-based, we'd use the camera API
      }
      async stopScanning(device: HardwareDevice): Promise<void> {}
      onScan(handler: (result: BarcodeScanResult) => void): void {
        this.scanHandler = handler;
      }
      offScan(handler: (result: BarcodeScanResult) => void): void {
        if (this.scanHandler === handler) this.scanHandler = undefined;
      }
      getSupportedFormats(): BarcodeFormat[] {
        return [
          "ean13",
          "ean8",
          "upc",
          "code128",
          "code39",
          "qr",
        ] as BarcodeFormat[];
      }
      async setScanMode(
        device: HardwareDevice,
        mode: "trigger" | "continuous" | "presentation"
      ): Promise<void> {}

      // Simulate a scan for testing
      simulateScan(value: string, format: string, deviceId: string) {
        if (this.scanHandler) {
          this.scanHandler({
            value,
            format,
            timestamp: new Date(),
            scannerId: deviceId,
          });
        }
      }
    }

    class HIDBarcodeScannerDriver extends GenericBarcodeScannerDriver {}
    class CameraBarcodeScannerDriver extends GenericBarcodeScannerDriver {}

    // Customer Display Drivers
    class GenericDisplayDriver implements CustomerDisplayDriver {
      async connect(device: HardwareDevice): Promise<void> {}
      async disconnect(device: HardwareDevice): Promise<void> {}
      async showMessage(
        device: HardwareDevice,
        message: CustomerDisplayMessage
      ): Promise<void> {
        devLog("Display message:", message);
      }
      async clear(device: HardwareDevice): Promise<void> {}
      async setBrightness(
        device: HardwareDevice,
        level: number
      ): Promise<void> {}
      async showCustom(
        device: HardwareDevice,
        lines: string[],
        options?: DisplayOptions
      ): Promise<void> {}
      async showAdvertisement(
        device: HardwareDevice,
        imageBase64: string,
        duration: number
      ): Promise<void> {}
    }

    class WebDisplayDriver extends GenericDisplayDriver {
      async showMessage(
        device: HardwareDevice,
        message: CustomerDisplayMessage
      ): Promise<void> {
        // Emit event for web-based display
        window.dispatchEvent(
          new CustomEvent("pos:display", { detail: message })
        );
      }
    }

    // PIN Pad Drivers
    class GenericPinPadDriver implements PinPadDriver {
      async connect(device: HardwareDevice): Promise<void> {}
      async disconnect(device: HardwareDevice): Promise<void> {}
      async processPayment(
        device: HardwareDevice,
        amount: number,
        currency: string,
        options: any
      ): Promise<PaymentTerminalEvent> {
        devLog("Processing payment:", amount, currency);
        // Simulate approval for testing
        return {
          type: "approved",
          terminalId: device.id,
          transactionId: "TXN-" + Date.now(),
          amount,
          currency,
          cardType: "Visa",
          maskedPan: "**** **** **** 1234",
          authCode:
            "AUTH" + Math.random().toString(36).substr(2, 6).toUpperCase(),
          referenceNumber: "REF" + Date.now(),
          receiptData: "Receipt data",
          timestamp: new Date(),
        };
      }
      async refund(
        device: HardwareDevice,
        amount: number,
        currency: string,
        originalTransactionId: string
      ): Promise<PaymentTerminalEvent> {
        return {
          type: "approved",
          terminalId: device.id,
          amount,
          currency,
          timestamp: new Date(),
        };
      }
      async voidTransaction(
        device: HardwareDevice,
        transactionId: string
      ): Promise<PaymentTerminalEvent> {
        return {
          type: "cancelled",
          terminalId: device.id,
          timestamp: new Date(),
        };
      }
      async getBatteryLevel(device: HardwareDevice): Promise<number> {
        return 100;
      }
      async getSignalStrength(device: HardwareDevice): Promise<number> {
        return 100;
      }
    }

    class WebPinPadDriver extends GenericPinPadDriver {}

    // Scale Drivers
    class GenericScaleDriver implements ScaleDriver {
      private weightHandler?: (reading: ScaleReading) => void;

      async connect(device: HardwareDevice): Promise<void> {}
      async disconnect(device: HardwareDevice): Promise<void> {}
      async readWeight(device: HardwareDevice): Promise<ScaleReading> {
        return {
          weight: 0,
          unit: "kg",
          stable: true,
          overload: false,
          underload: false,
          timestamp: new Date(),
          deviceId: device.id,
        };
      }
      async tare(device: HardwareDevice): Promise<void> {}
      async zero(device: HardwareDevice): Promise<void> {}
      async calibrate(
        device: HardwareDevice,
        knownWeight: number
      ): Promise<void> {}
      async setUnit(device: HardwareDevice, unit: string): Promise<void> {}
      onWeightChange(handler: (reading: ScaleReading) => void): void {
        this.weightHandler = handler;
      }
      offWeightChange(handler: (reading: ScaleReading) => void): void {
        if (this.weightHandler === handler) this.weightHandler = undefined;
      }
    }

    class HIDScaleDriver extends GenericScaleDriver {}
    class NetworkScaleDriver extends GenericScaleDriver {}

    // Register all drivers
    this.registerPrinterDriver(
      "generic_escpos",
      new GenericESCPOSPrinterDriver()
    );
    this.registerPrinterDriver("network", new NetworkPrinterDriver());
    this.registerPrinterDriver("webusb", new WebUSBPrinterDriver());

    this.registerCashDrawerDriver(
      "printer_port",
      new PrinterPortCashDrawerDriver()
    );
    this.registerCashDrawerDriver("network", new NetworkCashDrawerDriver());

    this.registerScannerDriver("hid", new HIDBarcodeScannerDriver());
    this.registerScannerDriver("camera", new CameraBarcodeScannerDriver());

    this.registerDisplayDriver("web", new WebDisplayDriver());

    this.registerPinPadDriver("web", new WebPinPadDriver());

    this.registerScaleDriver("generic_hid", new HIDScaleDriver());
    this.registerScaleDriver("network", new NetworkScaleDriver());
  }

  // Driver registration
  registerPrinterDriver(name: string, driver: PrinterDriver) {
    this.printers.set(name, driver);
  }

  registerCashDrawerDriver(name: string, driver: CashDrawerDriver) {
    this.cashDrawers.set(name, driver);
  }

  registerScannerDriver(name: string, driver: BarcodeScannerDriver) {
    this.scanners.set(name, driver);
  }

  registerDisplayDriver(name: string, driver: CustomerDisplayDriver) {
    this.displays.set(name, driver);
  }

  registerPinPadDriver(name: string, driver: PinPadDriver) {
    this.pinPads.set(name, driver);
  }

  registerScaleDriver(name: string, driver: ScaleDriver) {
    this.scales.set(name, driver);
  }

  // Device discovery and connection
  async discoverDevices(): Promise<HardwareDevice[]> {
    const devices: HardwareDevice[] = [];

    // WebUSB devices
    if ("usb" in navigator) {
      try {
        const devices = await (navigator as any).usb.getDevices();
        for (const device of devices) {
          const hwDevice = await this.createDeviceFromUSB(device);
          if (hwDevice) devices.push(hwDevice);
        }
      } catch (e) {
        console.warn("WebUSB not available or permission denied:", e);
      }
    }

    // WebBluetooth devices
    if ("bluetooth" in navigator) {
      try {
        // We can't enumerate paired devices without user gesture
        // But we can listen for advertisements if permitted
      } catch (e) {
        console.warn("WebBluetooth not available:", e);
      }
    }

    // WebSerial devices
    if ("serial" in navigator) {
      try {
        const ports = await (navigator as any).serial.getPorts();
        for (const port of ports) {
          const device = await this.createDeviceFromSerialPort(port);
          if (device) devices.push(device);
        }
      } catch (e) {
        console.warn("WebSerial not available:", e);
      }
    }

    // Network devices (mDNS/Bonjour)
    await this.discoverNetworkDevices(devices);

    // Known configured devices
    for (const [deviceId, config] of this.config) {
      if (!devices.find(d => d.id === deviceId)) {
        const device = await this.createDeviceFromConfig(deviceId, config);
        if (device) devices.push(device);
      }
    }

    // Update device registry
    for (const device of devices) {
      this.devices.set(device.id, device);
    }

    return devices;
  }

  private async createDeviceFromUSB(
    device: any
  ): Promise<HardwareDevice | null> {
    try {
      const deviceInfo = {
        id: `usb_${device.vendorId}_${device.productId}_${device.serialNumber || "unknown"}`,
        type: this.guessDeviceType(device),
        name: device.productName || `USB Device ${device.productId}`,
        connectionType: "usb" as const,
        vendorId: device.vendorId,
        productId: device.productId,
        serialNumber: device.serialNumber,
        capabilities: await this.probeCapabilities(device),
        status: "connected" as const,
        lastSeen: new Date(),
        config: this.config.get(this.generateConfigKey(device)) || {
          scanMode: "trigger",
          beepEnabled: true,
          vibrationEnabled: true,
          displayMode: "text",
          brightness: 100,
          timeout: 30000,
          showAds: false,
          terminalId: "",
          merchantId: "",
          supportedCardSchemes: [],
          contactlessLimit: 0,
          defaultUnit: "kg",
          tareEnabled: true,
          autoZero: true,
        },
      };
      return (await this.openAndInitialize(device)) ? deviceInfo : null;
    } catch (e) {
      console.warn("Failed to create device from USB:", e);
      return null;
    }
  }

  private guessDeviceType(device: any): HardwareDevice["type"] {
    const classCode = device.deviceClass || device.classCode;
    // USB Class codes
    if (classCode === 0x07) return "printer"; // Printer class
    if (classCode === 0x08) return "barcode_scanner"; // Mass storage (often used by scanners)
    if (classCode === 0x03) return "barcode_scanner"; // HID (keyboard wedge scanners)
    if (classCode === 0x0b) return "scale"; // Smart card (sometimes scales)

    // Check by vendor/product
    const vendorId = device.vendorId;
    const productId = device.productId;

    // Known vendor IDs
    const printerVendors = [0x04b8, 0x0519, 0x04e8, 0x04f9, 0x0dd4]; // Epson, Star, Bixolon, Custom
    const scannerVendors = [0x05e0, 0x0c2e, 0x1a86, 0x05c0, 0x216f]; // Symbol, Metrologic, Honeywell, Datalogic, Newland
    const scaleVendors = [0x0eb8, 0x0ba2, 0x0f9d]; // CAS, Bizerba, Mettler

    if (printerVendors.includes(vendorId)) return "printer";
    if (scannerVendors.includes(vendorId)) return "barcode_scanner";
    if (scaleVendors.includes(vendorId)) return "scale";

    return "printer"; // Default to printer
  }

  private async createDeviceFromSerialPort(
    port: any
  ): Promise<HardwareDevice | null> {
    try {
      const deviceInfo: HardwareDevice = {
        id: `serial_${port.getInfo?.().usbVendorId || "unknown"}_${port.getInfo?.().usbProductId || "unknown"}`,
        type: "printer", // Default, could be detected
        name: `Serial Device ${port.getInfo?.().usbProductId || ""}`,
        connectionType: "serial" as const,
        vendorId: port.getInfo?.().usbVendorId,
        productId: port.getInfo?.().usbProductId,
        capabilities: {},
        status: "connected" as const,
        lastSeen: new Date(),
        config: {
          scanMode: "trigger",
          beepEnabled: true,
          vibrationEnabled: true,
          displayMode: "text",
          brightness: 100,
          timeout: 30000,
          showAds: false,
          terminalId: "",
          merchantId: "",
          supportedCardSchemes: [],
          contactlessLimit: 0,
          defaultUnit: "kg",
          tareEnabled: true,
          autoZero: true,
        },
      };
      return deviceInfo;
    } catch (e) {
      console.warn("Failed to create device from serial port:", e);
      return null;
    }
  }

  private async probeCapabilities(device: any): Promise<DeviceCapabilities> {
    // Probe device capabilities based on vendor/product ID
    const caps: DeviceCapabilities = {};
    const vendorId = device.vendorId;

    if (vendorId === 0x04b8 || vendorId === 0x0519 || vendorId === 0x04e8) {
      caps.canPrintReceipt = true;
      caps.canCutPaper = true;
      caps.printWidth = 80;
    }
    return caps;
  }

  private generateConfigKey(device: any): string {
    return `${device.vendorId}:${device.productId}`;
  }

  private async openAndInitialize(device: any): Promise<boolean> {
    // Try to open and initialize the device
    return true;
  }

  async discoverNetworkDevices(devices: HardwareDevice[]): Promise<void> {
    // mDNS/Bonjour discovery for network printers, scales, displays
    // This would typically use a library like bonjour or mdns
    // For now, we'll check known IPs from config
    for (const [deviceId, config] of this.config) {
      if (config.connectionType === "network" && config.ipAddress) {
        try {
          const response = await fetch(
            `http://${config.ipAddress}:${config.port || 9100}/status`,
            {
              method: "GET",
              signal: AbortSignal.timeout(2000),
            }
          );
          if (response.ok) {
            const device = await this.createDeviceFromConfig(deviceId, config);
            if (device) devices.push(device);
          }
        } catch (e) {
          // Device not reachable
        }
      }
    }
  }

  // Hardware event system
  on<K extends keyof DeviceManagerEvents>(
    event: K,
    handler: DeviceManagerEvents[K]
  ) {
    (this.eventHandlers as any)[event] = handler;
  }

  off<K extends keyof DeviceManagerEvents>(
    event: K,
    handler: DeviceManagerEvents[K]
  ) {
    // Remove handler — if it matches the current one, clear it
    if ((this.eventHandlers as any)[event] === handler) {
      delete (this.eventHandlers as any)[event];
    }
  }

  emit<K extends keyof DeviceManagerEvents>(
    event: K,
    ...args: Parameters<DeviceManagerEvents[K]>
  ) {
    const handler = (this.eventHandlers as any)[event];
    if (handler) handler(...args);
  }

  // Device connection management
  async connectDevice(deviceId: string): Promise<HardwareDevice> {
    const device = this.devices.get(deviceId);
    if (!device) throw new Error(`Device ${deviceId} not found`);

    const driver = this.getDriverForDevice(device);
    if (!driver)
      throw new Error(`No driver for device ${device.type} (${device.name})`);

    device.status = "initializing";
    this.emit("onDeviceStatusChange", device.id, "initializing");

    try {
      await driver.connect(device);
      device.status = "connected";
      device.lastSeen = new Date();

      // Start monitoring
      this.startDeviceMonitoring(device);

      this.emit("onDeviceConnected", device);
      return device;
    } catch (error) {
      device.status = "error";
      this.emit("onDeviceError", device.id, (error as Error).message);
      throw error;
    }
  }

  async disconnectDevice(deviceId: string): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) return;

    const driver = this.getDriverForDevice(device);
    if (driver) {
      await driver.disconnect(device);
    }

    device.status = "disconnected";
    this.stopDeviceMonitoring(device);
    this.emit("onDeviceDisconnected", deviceId);
  }

  private getDriverForDevice(device: HardwareDevice): DeviceDriver | null {
    switch (device.type) {
      case "printer":
        return (this.printers.get(this.getDriverName(device)) ||
          this.printers.get("generic_escpos")) as DeviceDriver | null;
      case "cash_drawer":
        return (this.cashDrawers.get(this.getDriverName(device)) ||
          this.cashDrawers.get("printer_port")) as DeviceDriver | null;
      case "barcode_scanner":
        return (this.scanners.get(this.getDriverName(device)) ||
          this.scanners.get("hid")) as DeviceDriver | null;
      case "customer_display":
        return (this.displays.get(this.getDriverName(device)) ||
          this.displays.get("generic_vfd")) as DeviceDriver | null;
      case "pin_pad":
        return (this.pinPads.get(this.getDriverName(device)) ||
          this.pinPads.get("web")) as DeviceDriver | null;
      case "scale":
        return (this.scales.get(this.getDriverName(device)) ||
          this.scales.get("generic_hid")) as DeviceDriver | null;
      default:
        return null;
    }
  }

  private getDriverName(device: HardwareDevice): string {
    // Determine driver based on device info
    const vendorId = device.vendorId?.toString(16);
    if (vendorId === "04b8") return "epson";
    if (vendorId === "0519") return "star";
    if (vendorId === "04e8") return "bixolon";
    if (vendorId === "0dd4") return "custom";
    if (vendorId === "05e0" || device.vendorId === 0x0c2e) return "honeywell";
    if (vendorId === "1a86") return "serial";
    if (vendorId === "0eb8") return "cas";
    if (vendorId === "0ba2") return "bizerba";
    if (vendorId === "0f9d") return "mettler_toledo";
    if (vendorId === "05c0" || device.vendorId === 0x05c0) return "datalogic";
    if (vendorId === "04b8" && device.productId === 0x0e15) return "epson";
    return "generic";
  }

  private async createDeviceFromConfig(
    deviceId: string,
    config: DeviceConfig
  ): Promise<HardwareDevice | null> {
    // Create device object from stored config
    return {
      id: deviceId,
      type: config.deviceType || "printer",
      name: config.name || "Unknown Device",
      connectionType: config.connectionType || "usb",
      vendorId: config.vendorId,
      productId: config.productId,
      capabilities: config.capabilities || {},
      status: "disconnected",
      lastSeen: new Date(),
      config: config,
    };
  }

  // Print queue management
  async addPrintJob(
    jobData: Omit<PrintJob, "id" | "status" | "createdAt">
  ): Promise<PrintJob> {
    const job: PrintJob = {
      ...jobData,
      id: crypto.randomUUID(),
      status: "pending",
      createdAt: new Date(),
    };
    this.printQueue.push(job);
    this.processPrintQueue();
    return job;
  }

  private async processPrintQueue() {
    if (this.isProcessingQueue || this.printQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.printQueue.length > 0) {
      const job = this.printQueue.shift()!;
      job.status = "printing";
      this.emit("onPrintJobStatus", job.id, "printing");

      try {
        const printer = await this.getPrinterForJob(job);
        if (!printer) throw new Error("No printer available");

        await printer.driver.print(job, printer.device);
        job.status = "completed";
        job.completedAt = new Date();
        this.emit("onPrintJobStatus", job.id, "completed");
      } catch (error) {
        job.status = "failed";
        job.error = (error as Error).message;
        this.emit(
          "onPrintJobStatus",
          job.id,
          "failed",
          (error as Error).message
        );

        // Retry logic
        if (job.copies > 1) {
          job.copies--;
          this.printQueue.unshift(job);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  private async getPrinterForJob(job: PrintJob): Promise<{
    driver: PrinterDriver;
    device: HardwareDevice;
  } | null> {
    const pick = async (
      device: HardwareDevice
    ): Promise<{ driver: PrinterDriver; device: HardwareDevice } | null> => {
      const driver = this.getPrinterDriver(device);
      if (driver) return { driver, device };
      return null;
    };
    if (job.printerId) {
      const device = this.devices.get(job.printerId);
      if (device) return await pick(device);
    }
    // Find default receipt printer
    for (const [id, device] of this.devices) {
      if (device.type === "printer" && device.status === "connected") {
        const driver = this.getPrinterDriver(device);
        if (driver && (await driver.supportsReceiptPrinting())) {
          return { driver, device };
        }
      }
    }
    return null;
  }

  private getPrinterDriver(device: HardwareDevice): PrinterDriver | null {
    return (this.printers.get(this.getDriverName(device)) ||
      this.printers.get("generic_escpos")) as PrinterDriver | null;
  }

  private getCashDrawerDriver(device: HardwareDevice): CashDrawerDriver | null {
    return (this.cashDrawers.get(this.getDriverName(device)) ||
      this.cashDrawers.get("printer_port")) as CashDrawerDriver | null;
  }

  private getScannerDriver(
    device: HardwareDevice
  ): BarcodeScannerDriver | null {
    return (this.scanners.get(this.getDriverName(device)) ||
      this.scanners.get("hid")) as BarcodeScannerDriver | null;
  }

  private getDisplayDriver(
    device: HardwareDevice
  ): CustomerDisplayDriver | null {
    return (this.displays.get(this.getDriverName(device)) ||
      this.displays.get("generic_vfd")) as CustomerDisplayDriver | null;
  }

  private getPinPadDriver(device: HardwareDevice): PinPadDriver | null {
    return (this.pinPads.get(this.getDriverName(device)) ||
      this.pinPads.get("web")) as PinPadDriver | null;
  }

  private getScaleDriver(device: HardwareDevice): ScaleDriver | null {
    return (this.scales.get(this.getDriverName(device)) ||
      this.scales.get("generic_hid")) as ScaleDriver | null;
  }

  // Cash drawer management
  async openCashDrawer(
    drawerId: string,
    userId: string,
    expectedAmount?: number,
    reason?: string
  ): Promise<CashDrawerEvent> {
    const device = this.devices.get(drawerId);
    if (!device || device.type !== "cash_drawer") {
      throw new Error(`Cash drawer ${drawerId} not found`);
    }

    const driver = this.getCashDrawerDriver(this.devices.get(drawerId)!);
    if (!driver) throw new Error(`No driver for cash drawer`);

    const event: CashDrawerEvent = {
      type: "open",
      drawerId,
      timestamp: new Date(),
      expectedAmount,
      userId,
      reason,
    };

    try {
      await driver.openDrawer(device);
      event.actualAmount =
        (await driver.getCashAmount?.(device)) ?? expectedAmount;
      event.discrepancy = expectedAmount
        ? (event.actualAmount || 0) - expectedAmount
        : undefined;

      this.emit("onCashDrawerEvent", event);
      return event;
    } catch (error) {
      event.type = "error";
      (event as any).error = (error as Error).message;
      this.emit("onCashDrawerEvent", event);
      throw error;
    }
  }

  async closeCashDrawer(drawerId: string): Promise<void> {
    const device = this.devices.get(drawerId);
    if (!device || device.type !== "cash_drawer") return;

    const driver = this.getCashDrawerDriver(this.devices.get(drawerId)!);
    if (driver) {
      await driver.closeDrawer(device);
    }
  }

  // Barcode scanning
  async startBarcodeScanner(
    scannerId: string,
    options?: { mode?: "trigger" | "continuous"; formats?: string[] }
  ): Promise<void> {
    const device = this.devices.get(scannerId);
    if (!device || device.type !== "barcode_scanner") {
      throw new Error(`Scanner ${scannerId} not found`);
    }

    const driver = this.getScannerDriver(this.devices.get(scannerId)!);
    if (!driver) throw new Error(`No driver for scanner ${scannerId}`);

    await driver.startScanning(device, options as any);
  }

  async stopBarcodeScanner(scannerId: string): Promise<void> {
    const device = this.devices.get(scannerId);
    if (!device) return;

    const driver = this.getScannerDriver(this.devices.get(scannerId)!);
    if (driver) await driver.stopScanning(device);
  }

  onBarcodeScan(handler: (result: BarcodeScanResult) => void) {
    this.eventHandlers.onBarcodeScan = handler;
  }

  // Customer display
  async updateCustomerDisplay(
    displayId: string,
    message: CustomerDisplayMessage
  ): Promise<void> {
    const device = this.devices.get(displayId);
    if (!device || device.type !== "customer_display") return;

    const driver = this.getDisplayDriver(this.devices.get(displayId)!);
    if (!driver) throw new Error(`No driver for display ${displayId}`);

    await driver.showMessage(device, message);
  }

  private formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat("ar-YE", {
      style: "currency",
      currency,
    }).format(amount);
  }

  showWelcomeMessage(displayId: string): Promise<void> {
    return this.updateCustomerDisplay(displayId, {
      type: "welcome",
      lines: ["الحسينية لخدمات الأعمال", "مرحباً بكم"],
      duration: 0,
    });
  }

  showItemAdded(
    displayId: string,
    itemName: string,
    price: number,
    currency: string
  ): Promise<void> {
    return this.updateCustomerDisplay(displayId, {
      type: "item_added",
      lines: ["تم إضافة:", itemName, this.formatCurrency(price, currency)],
      amount: price,
      currency,
      duration: 3000,
    });
  }

  showSubtotal(
    displayId: string,
    subtotal: number,
    currency: string
  ): Promise<void> {
    return this.updateCustomerDisplay(displayId, {
      type: "subtotal",
      lines: ["المجموع الفرعي:", this.formatCurrency(subtotal, currency)],
      amount: subtotal,
      currency,
      duration: 3000,
    });
  }

  showTotal(displayId: string, total: number, currency: string): Promise<void> {
    return this.updateCustomerDisplay(displayId, {
      type: "total",
      lines: ["الإجمالي:", this.formatCurrency(total, currency)],
      amount: total,
      currency,
      duration: 5000,
    });
  }

  showPayment(
    displayId: string,
    amount: number,
    method: string,
    currency: string
  ): Promise<void> {
    return this.updateCustomerDisplay(displayId, {
      type: "payment",
      lines: [`الدفع: ${method}`, this.formatCurrency(amount, currency)],
      amount,
      currency,
      duration: 3000,
    });
  }

  showChange(
    displayId: string,
    change: number,
    currency: string
  ): Promise<void> {
    return this.updateCustomerDisplay(displayId, {
      type: "change",
      lines: ["الباقي:", this.formatCurrency(change, currency)],
      amount: change,
      currency,
      duration: 5000,
    });
  }

  showThankYou(displayId: string): Promise<void> {
    return this.updateCustomerDisplay(displayId, {
      type: "thank_you",
      lines: ["شكراً لتعاملكم معنا", "نتمنى لكم يوماً سعيداً"],
      duration: 5000,
    });
  }

  // Payment terminal
  async connectPaymentTerminal(terminalId: string): Promise<void> {
    const device = this.devices.get(terminalId);
    if (!device || device.type !== "pin_pad") {
      throw new Error(`Payment terminal ${terminalId} not found`);
    }

    const driver = this.getPinPadDriver(this.devices.get(terminalId)!);
    if (!driver) throw new Error(`No driver for payment terminal`);

    await driver.connect(device);
    device.status = "connected";
    this.emit("onDeviceConnected", this.devices.get(terminalId)!);
  }

  async processPayment(
    terminalId: string,
    amount: number,
    currency: string,
    options: {
      reference?: string;
      callbackUrl?: string;
      tipAmount?: number;
      cashback?: number;
    } = {}
  ): Promise<PaymentTerminalEvent> {
    const device = this.devices.get(terminalId);
    if (!device || device.type !== "pin_pad") {
      throw new Error(`Payment terminal ${terminalId} not found`);
    }

    const driver = this.getPinPadDriver(this.devices.get(terminalId)!);
    if (!driver) throw new Error(`No driver for payment terminal`);

    const event: PaymentTerminalEvent = {
      type: "transaction_started",
      terminalId,
      amount,
      currency,
      timestamp: new Date(),
    };

    this.emit("onPaymentTerminalEvent", event);

    try {
      const result = await driver.processPayment(
        device,
        amount,
        currency,
        options
      );

      const resultEvent: PaymentTerminalEvent = {
        type: result.type === "approved" ? "approved" : "declined",
        terminalId,
        transactionId: result.transactionId,
        amount,
        currency,
        cardType: result.cardType,
        maskedPan: result.maskedPan,
        authCode: result.authCode,
        referenceNumber: result.referenceNumber,
        receiptData: result.receiptData,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        timestamp: new Date(),
      };

      this.emit("onPaymentTerminalEvent", resultEvent);
      return resultEvent;
    } catch (error) {
      const errorEvent: PaymentTerminalEvent = {
        type: "error",
        terminalId,
        errorCode: (error as Error).message,
        errorMessage: (error as Error).message,
        timestamp: new Date(),
      };
      this.emit("onPaymentTerminalEvent", errorEvent);
      throw error;
    }
  }

  // Scale integration
  async connectScale(scaleId: string): Promise<void> {
    const device = this.devices.get(scaleId);
    if (!device || device.type !== "scale")
      throw new Error(`Scale ${scaleId} not found`);

    const driver = this.getScaleDriver(this.devices.get(scaleId)!);
    if (!driver) throw new Error(`No driver for scale ${scaleId}`);
    await driver.connect(device);
    device.status = "connected";

    // Start continuous reading
    driver.onWeightChange((reading: ScaleReading) => {
      this.emit("onScaleReading", reading);
    });
  }

  async readScale(scaleId: string): Promise<ScaleReading> {
    const device = this.devices.get(scaleId);
    if (!device || device.type !== "scale")
      throw new Error(`Scale ${scaleId} not found`);

    const driver = this.getScaleDriver(this.devices.get(scaleId)!);
    if (!driver) throw new Error(`No driver for scale ${scaleId}`);
    return driver.readWeight(device);
  }

  async tareScale(scaleId: string): Promise<void> {
    const device = this.devices.get(scaleId);
    if (!device || device.type !== "scale")
      throw new Error(`Scale ${scaleId} not found`);

    const driver = this.getScaleDriver(this.devices.get(scaleId)!);
    if (!driver) throw new Error(`No driver for scale ${scaleId}`);
    await driver.tare(device);
  }

  // Offline queue management
  private offlineQueue: Map<string, OfflineQueueItem> = new Map();
  private syncInProgress = false;

  queueForSync(
    itemData: Omit<OfflineQueueItem, "id" | "timestamp" | "retries">
  ): string {
    const item: OfflineQueueItem = {
      ...itemData,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      retries: 0,
      maxRetries: 5,
    };
    this.offlineQueue.set(item.id, item);
    return item.id;
  }

  async processOfflineQueue(): Promise<void> {
    if (this.syncInProgress || this.offlineQueue.size === 0) return;

    this.syncInProgress = true;
    const items = Array.from(this.offlineQueue.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    for (const item of items) {
      if (item.retries >= item.maxRetries) {
        this.offlineQueue.delete(item.id);
        continue;
      }

      try {
        await this.processQueueItem(item);
        this.offlineQueue.delete(item.id);
      } catch (error) {
        item.retries++;
        console.error(`Sync failed for ${item.id}:`, error);
      }
    }

    this.syncInProgress = false;
  }

  private async processQueueItem(item: OfflineQueueItem): Promise<void> {
    switch (item.type) {
      case "sale":
        // await this.submitSaleOffline(item.payload);
        devLog("Process offline sale:", item.payload);
        break;
      case "return":
        // await this.processReturnOffline(item.payload);
        devLog("Process offline return:", item.payload);
        break;
      case "payment":
        // await this.processPaymentOffline(item.payload);
        devLog("Process offline payment:", item.payload);
        break;
      case "stock_adjustment":
        // await this.adjustStockOffline(item.payload);
        devLog("Process offline stock adjustment:", item.payload);
        break;
    }
  }

  // Device monitoring
  private startDeviceMonitoring(device: HardwareDevice): void {
    const timer = setInterval(async () => {
      if (!this.devices.has(device.id)) {
        clearInterval(this.reconnectTimers.get(device.id));
        return;
      }

      try {
        const driver = this.getDriverForDevice(device);
        if (driver && "ping" in driver) {
          const alive = await (driver as any).ping(device);
          if (!alive && device.status === "connected") {
            device.status = "disconnected";
            this.emit("onDeviceDisconnected", device.id);
            this.scheduleReconnect(device.id);
          } else if (alive && device.status === "disconnected") {
            device.status = "connected";
            this.emit("onDeviceConnected", device);
          }
          device.lastSeen = new Date();
        }
      } catch (error) {
        console.warn(`Device monitoring failed for ${device.id}:`, error);
      }
    }, 30000); // Check every 30 seconds

    this.reconnectTimers.set(device.id, timer);
  }

  private stopDeviceMonitoring(device: HardwareDevice): void {
    const timer = this.reconnectTimers.get(device.id);
    if (timer) {
      clearInterval(this.reconnectTimers.get(device.id));
      this.reconnectTimers.delete(device.id);
    }
  }

  private scheduleReconnect(deviceId: string): void {
    if (this.reconnectTimers.has(deviceId)) return;

    const timer = setTimeout(async () => {
      this.reconnectTimers.delete(deviceId);
      const device = this.devices.get(deviceId);
      if (device && device.status === "disconnected") {
        try {
          await this.connectDevice(deviceId);
        } catch (e) {
          console.warn(`Reconnect failed for ${deviceId}:`, e);
          this.scheduleReconnect(deviceId); // Exponential backoff could be added
        }
      }
    }, 10000); // 10 seconds

    this.reconnectTimers.set(deviceId, timer);
  }

  // Cleanup
  async dispose(): Promise<void> {
    // Disconnect all devices
    for (const device of this.devices.values()) {
      if (device.status === "connected") {
        await this.disconnectDevice(device.id);
      }
    }

    // Clear timers
    for (const timer of this.reconnectTimers.values()) {
      clearInterval(timer);
    }
    this.reconnectTimers.clear();

    // Clear queues
    this.printQueue = [];
    this.offlineQueue.clear();

    // Clear device watchers
    for (const watcher of this.deviceWatchers.values()) {
      if (watcher.unsubscribe) watcher.unsubscribe();
    }
    this.deviceWatchers.clear();

    this.devices.clear();
  }
}

// ============================================
// DRIVER INTERFACES
// ============================================

export interface DeviceDriver {
  connect(device: HardwareDevice): Promise<void>;
  disconnect(device: HardwareDevice): Promise<void>;
  ping?(device: HardwareDevice): Promise<boolean>;
}

export interface PrinterDriver extends DeviceDriver {
  print(job: PrintJob, device: HardwareDevice): Promise<void>;
  printRaw(device: HardwareDevice, data: Uint8Array): Promise<void>;
  getStatus(device: HardwareDevice): Promise<PrinterStatus>;
  supportsReceiptPrinting(): Promise<boolean>;
  supportsLabelPrinting(): boolean;
  getSupportedPaperSizes(): string[];
}

export interface PrinterStatus {
  online: boolean;
  paperStatus: "ok" | "low" | "out" | "unknown";
  coverOpen: boolean;
  paperJam: boolean;
  temperature?: number;
  firmwareVersion?: string;
}

export interface CashDrawerDriver extends DeviceDriver {
  openDrawer(device: HardwareDevice): Promise<void>;
  closeDrawer(device: HardwareDevice): Promise<void>;
  getDrawerStatus(device: HardwareDevice): Promise<CashDrawerStatus>;
  getCashAmount?(device: HardwareDevice): Promise<number>;
}

export interface CashDrawerStatus {
  open: boolean;
  locked: boolean;
  sensorWorking: boolean;
}

export type BarcodeFormat =
  | "ean13"
  | "ean8"
  | "upc"
  | "code128"
  | "code39"
  | "qr"
  | "datamatrix"
  | "pdf417"
  | "aztec";

export interface BarcodeScannerDriver extends DeviceDriver {
  startScanning(device: HardwareDevice, options?: ScanOptions): Promise<void>;
  stopScanning(device: HardwareDevice): Promise<void>;
  onScan(handler: (result: BarcodeScanResult) => void): void;
  offScan(handler: (result: BarcodeScanResult) => void): void;
  getSupportedFormats(): BarcodeFormat[];
  setScanMode(
    device: HardwareDevice,
    mode: "trigger" | "continuous" | "presentation"
  ): Promise<void>;
}

export interface ScanOptions {
  mode?: "trigger" | "continuous" | "presentation";
  formats?: BarcodeFormat[];
  beepEnabled?: boolean;
  vibrationEnabled?: boolean;
  prefix?: string;
  suffix?: string;
}

export interface CustomerDisplayDriver extends DeviceDriver {
  showMessage(
    device: HardwareDevice,
    message: CustomerDisplayMessage
  ): Promise<void>;
  clear(device: HardwareDevice): Promise<void>;
  setBrightness(device: HardwareDevice, level: number): Promise<void>;
  showCustom(
    device: HardwareDevice,
    lines: string[],
    options?: DisplayOptions
  ): Promise<void>;
  showAdvertisement(
    device: HardwareDevice,
    imageBase64: string,
    duration: number
  ): Promise<void>;
}

export interface DisplayOptions {
  alignment?: "left" | "center" | "right";
  fontSize?: "small" | "medium" | "large";
  scroll?: boolean;
  scrollSpeed?: number;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
}

export interface PinPadDriver extends DeviceDriver {
  connect(device: HardwareDevice): Promise<void>;
  disconnect(device: HardwareDevice): Promise<void>;
  processPayment(
    device: HardwareDevice,
    amount: number,
    currency: string,
    options: {
      reference?: string;
      callbackUrl?: string;
      tipAmount?: number;
      cashback?: number;
    }
  ): Promise<PaymentTerminalEvent>;
  refund(
    device: HardwareDevice,
    amount: number,
    currency: string,
    originalTransactionId: string
  ): Promise<PaymentTerminalEvent>;
  voidTransaction(
    device: HardwareDevice,
    transactionId: string
  ): Promise<PaymentTerminalEvent>;
  getBatteryLevel(device: HardwareDevice): Promise<number>;
  getSignalStrength(device: HardwareDevice): Promise<number>;
}

export interface ScaleDriver extends DeviceDriver {
  readWeight(device: HardwareDevice): Promise<ScaleReading>;
  tare(device: HardwareDevice): Promise<void>;
  zero(device: HardwareDevice): Promise<void>;
  calibrate(device: HardwareDevice, knownWeight: number): Promise<void>;
  setUnit(device: HardwareDevice, unit: string): Promise<void>;
  onWeightChange(handler: (reading: ScaleReading) => void): void;
  offWeightChange(handler: (reading: ScaleReading) => void): void;
}

export interface PrinterStatus {
  online: boolean;
  paperStatus: "ok" | "low" | "out" | "unknown";
  coverOpen: boolean;
  paperJam: boolean;
  temperature?: number;
  firmwareVersion?: string;
}

export interface CashDrawerStatus {
  open: boolean;
  locked: boolean;
  sensorWorking: boolean;
}

export interface ScanOptions {
  mode?: "trigger" | "continuous" | "presentation";
  formats?: BarcodeFormat[];
  beepEnabled?: boolean;
  vibrationEnabled?: boolean;
  prefix?: string;
  suffix?: string;
}

export interface DisplayOptions {
  alignment?: "left" | "center" | "right";
  fontSize?: "small" | "medium" | "large";
  scroll?: boolean;
  scrollSpeed?: number;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
}

export interface PaymentTerminalEvent {
  type:
    | "transaction_started"
    | "card_inserted"
    | "pin_entry"
    | "contactless_tap"
    | "processing"
    | "approved"
    | "declined"
    | "cancelled"
    | "error"
    | "timeout";
  terminalId: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
  cardType?: string;
  maskedPan?: string;
  authCode?: string;
  referenceNumber?: string;
  receiptData?: string;
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}
