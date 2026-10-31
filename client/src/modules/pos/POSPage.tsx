"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { friendlyError } from "@/lib/friendlyErrors";
import { toast } from "sonner";
import { AppSidebar } from "@/components/AppSidebar";
import {
  ShoppingCart,
  Receipt,
  Banknote,
  CreditCard,
  Send,
  Smartphone,
  CheckCircle2,
  X,
  AlertTriangle,
  Package,
  Barcode,
  Camera,
  RotateCcw,
  Zap,
  Bell,
  Calendar,
  Settings,
  Download,
  Printer,
  RefreshCw,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Usb,
  Bluetooth,
  Monitor,
  Scale,
  CreditCard as PinPadIcon,
  HardDrive,
  Trash2,
  Plus,
  Search,
  Check,
  Loader2,
} from "lucide-react";
import { Cart } from "@/modules/pos/components/Cart";
import {
  InvoicePreviewDialog,
  type InvoicePreviewLine,
} from "@/components/InvoicePreviewDialog";
import { ProductCatalog } from "@/modules/pos/components/ProductCatalog";
import { usePOSCart } from "@/modules/pos/hooks/usePOSCart";
import { usePOSSession } from "@/modules/pos/hooks/usePOSSession";
import { usePOSNotifications } from "@/modules/pos/hooks/usePOSNotifications";
import { usePOSProductSearch } from "@/modules/pos/hooks/usePOSProductSearch";
import { useOfflineQueue } from "@/modules/pos/hooks/useOfflineQueue";
import {
  createBarcodeScanner,
  parseBarcodeValue,
  validateBarcode,
} from "@/modules/pos/utils/barcodeScanner";
import { formatCurrency } from "@/modules/pos/utils/currency";
import type {
  POSConfig,
  SalesPolicy,
  PaymentMethodConfig,
  ProductSearchResult,
  PaymentMethodKey,
  POSSession,
} from "@/modules/pos/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HardwareManager,
  type HardwareDevice,
  type DeviceConfig,
  type CustomerDisplayMessage,
  type PrintJob,
  type CashDrawerEvent,
  type BarcodeScanResult,
  type PaymentTerminalEvent,
  type ScaleReading,
} from "@/modules/pos/services/hardwareIntegration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function POSModule() {
  const utils = trpc.useUtils();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showDaily, setShowDaily] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHolds, setShowHolds] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(false);
  const [showSaleReview, setShowSaleReview] = useState(false);
  const [reviewLines, setReviewLines] = useState<InvoicePreviewLine[]>([]);
  const [reviewHeader, setReviewHeader] = useState({
    customerId: undefined as number | undefined,
    paymentMethod: "cash",
    paidAmount: "0",
    discount: "0",
    taxRate: "0",
    currency: "YER",
    currencyRate: "1",
    notes: "",
    warehouseId: null as number | null,
  });

  const { data: settingsData } = trpc.accounting.getSettings.useQuery(
    undefined,
    { staleTime: 60_000 }
  );
  const updateSettingsMutation = trpc.accounting.updateSettings.useMutation({
    onSuccess: () => utils.accounting.getSettings.invalidate(),
    onError: () => toast.error("تعذر حفظ الإعدادات"),
  });
  const config = (settingsData?.posConfig as POSConfig) || {
    template: "standard",
    columns: 4,
    showStock: true,
    showCategories: true,
    barcodeFocus: false,
    allowServices: true,
    quickAdd: true,
    showCustomer: true,
    autoPrint: false,
    soundEnabled: true,
    vibrationEnabled: true,
    scanMode: "camera",
    supportedFormats: [
      "ean13",
      "ean8",
      "upc",
      "code128",
      "code39",
      "qr",
      "datamatrix",
      "pdf417",
      "aztec",
    ],
    theme: "light",
    language: "ar",
    currency: "YER",
    decimals: 0,
    taxInclusive: false,
    defaultWarehouseId: null,
    enableOffline: true,
    syncInterval: 30000,
    holdTimeout: 3600000,
    maxHolds: 10,
    requireCustomerForCredit: true,
    allowSplitPayment: true,
    allowPartialPayment: true,
    roundingMethod: "none",
    roundingPrecision: 2,
  };

  const salesPolicy = (settingsData?.salesPolicy as SalesPolicy) || {
    allowMixedGoodsServices: true,
    requireCustomer: false,
    allowCredit: true,
    defaultPayment: "cash",
    allowNegativeStock: false,
    defaultWarehouseId: null,
    roundTotal: false,
    maxDiscountPercent: 100,
    maxLineDiscountPercent: 100,
    requireManagerApprovalAbove: 100000,
    allowPriceOverride: false,
    allowQuantityOverride: true,
    enableLoyalty: true,
    loyaltyPointsPerCurrency: 1,
    loyaltyRedemptionRate: 1,
  };

  const paymentMethods =
    (settingsData?.paymentMethods as PaymentMethodConfig[]) || [
      {
        key: "cash",
        label: "نقدي",
        labelAr: "نقدي",
        icon: "Banknote",
        enabled: true,
        accountCode: "1010",
        requiresReference: false,
        referenceLabel: "",
        referenceLabelAr: "",
        minAmount: 0,
        maxAmount: null,
        feePercent: 0,
        feeFixed: 0,
        sortOrder: 1,
      },
      {
        key: "card",
        label: "بطاقة",
        labelAr: "بطاقة",
        icon: "CreditCard",
        enabled: true,
        accountCode: "1021",
        requiresReference: true,
        referenceLabel: "رقم المرجع",
        referenceLabelAr: "رقم المرجع",
        minAmount: 0,
        maxAmount: null,
        feePercent: 0,
        feeFixed: 0,
        sortOrder: 2,
      },
      {
        key: "transfer",
        label: "تحويل",
        labelAr: "تحويل",
        icon: "Send",
        enabled: true,
        accountCode: "1022",
        requiresReference: true,
        referenceLabel: "رقم التحويل",
        referenceLabelAr: "رقم التحويل",
        minAmount: 0,
        maxAmount: null,
        feePercent: 0,
        feeFixed: 0,
        sortOrder: 3,
      },
      {
        key: "credit",
        label: "آجل",
        labelAr: "آجل",
        icon: "Receipt",
        enabled: true,
        accountCode: "1030",
        requiresReference: false,
        referenceLabel: "",
        referenceLabelAr: "",
        minAmount: 0,
        maxAmount: null,
        feePercent: 0,
        feeFixed: 0,
        sortOrder: 4,
      },
      {
        key: "online",
        label: "أونلاين",
        labelAr: "أونلاين",
        icon: "Smartphone",
        enabled: true,
        accountCode: "1023",
        requiresReference: true,
        referenceLabel: "معرف الدفع",
        referenceLabelAr: "معرف الدفع",
        minAmount: 0,
        maxAmount: null,
        feePercent: 0,
        feeFixed: 0,
        sortOrder: 5,
      },
    ];

  const enabledPaymentMethods = paymentMethods
    .filter(p => p.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const session = usePOSSession({
    autoOpen: false,
    openingFloat: 0,
    branchId: undefined,
    deviceId: undefined,
  });

  const { user: authUser } = useAuth();

  const cart = usePOSCart({
    salesPolicy,
    config,
    onError: msg => toast.error(friendlyError(msg)),
    getApplicableOffers: async (productId, quantity) => {
      try {
        const data = await utils.modules.offers.applicable.fetch({
          productId,
          qty: quantity,
        });
        return (data as any) || [];
      } catch {
        return [];
      }
    },
    getProductUnits: async productId => {
      try {
        const data = await utils.modules.productUnits.list.fetch({ productId });
        return (data as any) || [];
      } catch {
        return [];
      }
    },
  });

  const notifications = usePOSNotifications({
    autoFetch: true,
    fetchInterval: 30000,
    onNotification: n => {
      if (config.soundEnabled) {
        new Audio("/sounds/notification.mp3").play().catch(() => {});
      }
      if (config.vibrationEnabled && "vibrate" in navigator) {
        navigator.vibrate(200);
      }
    },
  });

  const productSearch = usePOSProductSearch({
    limit: 100,
    debounceMs: 300,
    warehouseId: config.defaultWarehouseId || undefined,
  });

  const offlineQueue = useOfflineQueue();

  // Hardware Integration
  const hardwareManagerRef = useRef<HardwareManager | null>(null);
  const [hardwareDevices, setHardwareDevices] = useState<HardwareDevice[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string | null>(
    null
  );
  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);
  const [selectedScannerId, setSelectedScannerId] = useState<string | null>(
    null
  );
  const [selectedDisplayId, setSelectedDisplayId] = useState<string | null>(
    null
  );
  const [selectedPinPadId, setSelectedPinPadId] = useState<string | null>(null);
  const [selectedScaleId, setSelectedScaleId] = useState<string | null>(null);
  const [isDiscoveringDevices, setIsDiscoveringDevices] = useState(false);
  const [hardwareError, setHardwareError] = useState<string | null>(null);
  const [showHardwareSettings, setShowHardwareSettings] = useState(false);

  // Keep latest handlers for hardware event bus without re-binding the effect
  const handleBarcodeScanRef = useRef<(value: string) => void>(() => {});
  const discoverDevicesRef = useRef<() => Promise<void>>(async () => {});
  const openCashDrawerRef = useRef<(reason?: string) => Promise<void>>(
    async () => {}
  );
  const printReceiptRef = useRef<
    (invoiceNumber: string, cartData: any) => Promise<void>
  >(async () => {});

  // Initialize hardware manager
  useEffect(() => {
    hardwareManagerRef.current = new HardwareManager();

    // Set up event handlers
    hardwareManagerRef.current.on(
      "onDeviceConnected",
      (device: HardwareDevice) => {
        setHardwareDevices(prev => {
          const exists = prev.find(d => d.id === device.id);
          if (exists) {
            return prev.map(d => (d.id === device.id ? device : d));
          }
          return [...prev, device];
        });
        toast.success(`جهاز متصل: ${device.name}`);
      }
    );

    hardwareManagerRef.current.on(
      "onDeviceDisconnected",
      (deviceId: string) => {
        setHardwareDevices(prev =>
          prev.map(d =>
            d.id === deviceId ? { ...d, status: "disconnected" as const } : d
          )
        );
        toast.warning(`جهاز مفصول: ${deviceId}`);
      }
    );

    hardwareManagerRef.current.on(
      "onDeviceError",
      (deviceId: string, error: string) => {
        setHardwareDevices(prev =>
          prev.map(d =>
            d.id === deviceId ? { ...d, status: "error" as const } : d
          )
        );
        toast.error(`خطأ في الجهاز ${deviceId}: ${error}`);
      }
    );

    hardwareManagerRef.current.on(
      "onBarcodeScan",
      (result: BarcodeScanResult) => {
        handleBarcodeScanRef.current(result.value);
      }
    );

    hardwareManagerRef.current.on(
      "onPrintJobStatus",
      (jobId: string, status: string, error?: string) => {
        if (status === "completed") {
          toast.success("تمت الطباعة بنجاح");
        } else if (status === "failed") {
          toast.error(`فشل الطباعة: ${error}`);
        }
      }
    );

    hardwareManagerRef.current.on(
      "onCashDrawerEvent",
      (event: CashDrawerEvent) => {
        if (event.type === "open") {
          toast.success("تم فتح درج النقود");
        }
      }
    );

    hardwareManagerRef.current.on(
      "onPaymentTerminalEvent",
      (event: PaymentTerminalEvent) => {
        if (event.type === "approved") {
          toast.success(`تمت الموافقة على الدفع: ${event.authCode}`);
        } else if (event.type === "declined") {
          toast.error(`تم رفض الدفع: ${event.errorMessage}`);
        }
      }
    );

    // Scale readings are wired for future weight-based (sell-by-weight) checkout.
    // Auto-add weighed item to cart when a scale product is selected.
    hardwareManagerRef.current.on("onScaleReading", () => {
      // No-op: reserved for scale-product flow
    });

    // Initial device discovery
    discoverDevicesRef.current();

    return () => {
      hardwareManagerRef.current?.dispose();
    };
  }, []);

  const discoverDevices = useCallback(async () => {
    if (!hardwareManagerRef.current) return;
    setIsDiscoveringDevices(true);
    setHardwareError(null);
    try {
      const devices = await hardwareManagerRef.current.discoverDevices();
      setHardwareDevices(devices);
      // Auto-select first device of each type
      const byType = devices.reduce(
        (acc, d) => {
          if (!acc[d.type] && d.status === "connected") acc[d.type] = d.id;
          return acc;
        },
        {} as Record<string, string>
      );

      if (byType.printer) setSelectedPrinterId(byType.printer);
      if (byType.cash_drawer) setSelectedDrawerId(byType.cash_drawer);
      if (byType.barcode_scanner) setSelectedScannerId(byType.barcode_scanner);
      if (byType.customer_display)
        setSelectedDisplayId(byType.customer_display);
      if (byType.pin_pad) setSelectedPinPadId(byType.pin_pad);
      if (byType.scale) setSelectedScaleId(byType.scale);

      toast.success(`تم اكتشاف ${devices.length} جهاز`);
    } catch (error) {
      setHardwareError((error as Error).message);
      toast.error("فشل اكتشاف الأجهزة");
    } finally {
      setIsDiscoveringDevices(false);
    }
  }, []);

  const connectDevice = useCallback(async (deviceId: string) => {
    if (!hardwareManagerRef.current) return;
    try {
      await hardwareManagerRef.current.connectDevice(deviceId);
    } catch (error) {
      toast.error(`فشل الاتصال: ${(error as Error).message}`);
    }
  }, []);

  const disconnectDevice = useCallback(async (deviceId: string) => {
    if (!hardwareManagerRef.current) return;
    try {
      await hardwareManagerRef.current.disconnectDevice(deviceId);
    } catch (error) {
      toast.error(`فشل الفصل: ${(error as Error).message}`);
    }
  }, []);

  const printReceipt = useCallback(
    async (invoiceNumber: string, cartData: any) => {
      if (!hardwareManagerRef.current || !selectedPrinterId) {
        // Fallback to browser print
        window.print();
        return;
      }

      const job: Omit<PrintJob, "id" | "status" | "createdAt"> = {
        type: "receipt",
        content: {
          type: "receipt",
          data: {
            invoiceNumber,
            items: cartData.items,
            totals: cartData.summary,
            payments: cartData.payments,
            customer: cartData.customer,
            timestamp: new Date().toISOString(),
          },
        },
        printerId: selectedPrinterId,
        copies: 1,
        priority: "high",
        options: {
          copies: 1,
          cutPaper: true,
          header: settingsData?.institutionName || "اسم المنشأة",
          footer: "شكراً لتعاملكم معنا",
          quality: "normal",
          encoding: "utf-8",
        },
      };

      await hardwareManagerRef.current.addPrintJob(job);
    },
    [selectedPrinterId, settingsData?.institutionName]
  );

  const openCashDrawer = useCallback(
    async (reason?: string) => {
      if (!hardwareManagerRef.current || !selectedDrawerId) {
        toast.warning("لا يوجد درج نقود متصل");
        return;
      }

      const sessionSummary = session.getSessionSummary();
      const operatorId = authUser?.openId || "unknown";
      await hardwareManagerRef.current.openCashDrawer(
        selectedDrawerId,
        operatorId,
        sessionSummary?.expectedFloat,
        reason || "إتمام عملية بيع"
      );
    },
    [selectedDrawerId, session, authUser?.openId]
  );

  const updateCustomerDisplay = useCallback(
    async (message: CustomerDisplayMessage) => {
      if (!hardwareManagerRef.current || !selectedDisplayId) return;
      await hardwareManagerRef.current.updateCustomerDisplay(
        selectedDisplayId,
        message
      );
    },
    [selectedDisplayId]
  );

  const processCardPayment = useCallback(
    async (amount: number, reference?: string) => {
      if (!hardwareManagerRef.current || !selectedPinPadId) {
        toast.warning("لا يوجد جهاز دفع متصل");
        return null;
      }

      return hardwareManagerRef.current.processPayment(
        selectedPinPadId,
        amount,
        config.currency,
        { reference }
      );
    },
    [selectedPinPadId, config.currency]
  );

  const readScaleWeight = useCallback(async () => {
    if (!hardwareManagerRef.current || !selectedScaleId) {
      toast.warning("لا يوجد ميزان متصل");
      return null;
    }
    return hardwareManagerRef.current.readScale(selectedScaleId);
  }, [selectedScaleId]);

  const tareScale = useCallback(async () => {
    if (!hardwareManagerRef.current || !selectedScaleId) return;
    await hardwareManagerRef.current.tareScale(selectedScaleId);
  }, [selectedScaleId]);

  const getDeviceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      printer: "طابعة",
      cash_drawer: "درج نقود",
      barcode_scanner: "قارئ باركود",
      customer_display: "شاشة عميل",
      pin_pad: "جهاز دفع",
      scale: "ميزان",
    };
    return labels[type] || type;
  };

  const getConnectionTypeIcon = (type: string) => {
    switch (type) {
      case "usb":
        return <Usb className="h-4 w-4" />;
      case "bluetooth":
        return <Bluetooth className="h-4 w-4" />;
      case "network":
        return <Wifi className="h-4 w-4" />;
      case "serial":
        return <HardDrive className="h-4 w-4" />;
      case "hid":
        return <Monitor className="h-4 w-4" />;
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge
            variant="default"
            className="gap-1 bg-emerald-100 text-emerald-800"
          >
            <Wifi className="h-3 w-3" /> متصل
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="secondary" className="gap-1">
            <WifiOff className="h-3 w-3" /> مفصول
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" /> خطأ
          </Badge>
        );
      case "initializing":
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> جاري الاتصال...
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const createSaleMutation = trpc.sales.create.useMutation({
    onSuccess: (res: any) => {
      setShowSaleReview(false);
      toast.success("تمت عملية البيع بنجاح");
      setLastInvoice(res?.invoiceNumber ?? null);
      cart.clearCart();
      utils.sales.dailySummary.invalidate();
      utils.sales.list.invalidate();
      utils.modules.pos.listSessions.invalidate();

      // Hardware actions after successful sale
      if (config.autoPrint && res?.invoiceNumber) {
        printInvoice(res.invoiceNumber);
      }

      // Open cash drawer when a cash-family payment is involved (single or split)
      const submission = cart.getCartForSubmission();
      const hasCashPayment =
        submission.paymentMethod === "cash" ||
        submission.paymentMethod === "cash_yer" ||
        submission.paymentMethod === "cash_sar" ||
        (Array.isArray(submission.payments) &&
          submission.payments.some(p =>
            ["cash", "cash_yer", "cash_sar"].includes(p.method as string)
          ));
      if (hasCashPayment) {
        openCashDrawer("إتمام عملية بيع نقدي");
      }

      // Show thank you on customer display
      if (selectedDisplayId) {
        updateCustomerDisplay({
          type: "thank_you",
          lines: ["شكراً لتعاملكم معنا", "نتمنى لكم يوماً سعيداً"],
          duration: 5000,
        });
      }
    },
    onError: (e: any) => {
      toast.error(friendlyError(e, "تعذر إتمام البيع"));
      if (config.enableOffline) {
        const submission = cart.getCartForSubmission();
        offlineQueue.addToQueue({
          type: "sale",
          payload: submission,
          maxRetries: 5,
        } as any);
        toast.info("تم حفظ الفاتورة محلياً، ستتم المزامنة عند استعادة الاتصال");
      }
    },
  });

  // Real persisted holds (created via modules.pos.createHold)
  const holdsData = useMemo(
    () => ({
      items: (session.holds ?? []).map((h: any) => ({
        id: h.id,
        holdId: h.code,
        itemCount: h.itemCount || 0,
        total: Number(h.total || 0),
        _snapshot: h.snapshot,
      })),
    }),
    [session.holds]
  );

  const daily = trpc.sales.dailySummary.useQuery(undefined, {
    staleTime: 30_000,
    placeholderData: p => p,
  });

  const handleBarcodeScan = useCallback(
    async (value: string) => {
      const parsed = parseBarcodeValue(value);

      if (
        parsed.type !== "custom" &&
        !validateBarcode(value, parsed.type as any)
      ) {
        toast.warning("باركود غير صالح");
        return;
      }

      let product = await productSearch.searchByBarcode(value);
      if (!product) {
        product = await productSearch.searchByCode(value);
      }
      if (!product) {
        const products = productSearch.products;
        product =
          products.find(p => p.barcode === value || p.code === value) || null;
      }

      if (product) {
        cart.addToCart(product);
        if (config.soundEnabled) {
          new Audio("/sounds/scan-success.mp3").play().catch(() => {});
        }
      } else {
        toast.error("لم يتم العثور على منتج بهذا الباركود");
        if (config.soundEnabled) {
          new Audio("/sounds/scan-error.mp3").play().catch(() => {});
        }
      }
    },
    [productSearch, cart, config.soundEnabled]
  );

  // Sync latest callback closures onto stable refs used by the hardware event bus
  useEffect(() => {
    handleBarcodeScanRef.current = handleBarcodeScan;
    discoverDevicesRef.current = discoverDevices;
    openCashDrawerRef.current = openCashDrawer;
    printReceiptRef.current = printReceipt;
  });

  const handleScannerResult = useCallback(
    (result: any) => {
      handleBarcodeScan(result.value);
      if (config.scanMode !== "continuous") {
        setShowScanner(false);
      }
    },
    [handleBarcodeScan, config.scanMode]
  );

  useEffect(() => {
    if (showScanner && videoRef.current) {
      scannerRef.current = createBarcodeScanner({
        onScan: handleScannerResult,
        onError: setScannerError,
        mode: config.scanMode,
        formats: config.supportedFormats,
        cameraFacing: "environment",
        hideAfterScan: config.scanMode !== "continuous",
      });
      scannerRef.current.startCameraScanner(videoRef.current);
    } else if (scannerRef.current) {
      scannerRef.current.stopCameraScanner();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stopCameraScanner();
        scannerRef.current.destroy();
      }
    };
  }, [
    showScanner,
    handleScannerResult,
    config.scanMode,
    config.supportedFormats,
  ]);

  const handleHold = useCallback(async () => {
    if (cart.cart.length === 0) {
      toast.warning("السلة فارغة — لا شيء للتعليق");
      return;
    }
    const snap = {
      cart: cart.cart,
      selectedCustomer: cart.selectedCustomer,
      notes: cart.notes,
      globalDiscount: cart.globalDiscount,
      globalDiscountPercent: cart.globalDiscountPercent,
      payments: cart.payments,
      paidAmount: cart.paidAmount,
      paymentMethod: cart.paymentMethod,
      loyaltyPointsRedeemed: cart.loyaltyPointsRedeemed,
    };
    try {
      const held = await session.createHold({
        snapshot: JSON.stringify(snap),
        total: cart.summary.total.toString(),
        itemCount: cart.summary.itemCount,
        customerId: cart.selectedCustomer?.id,
        sessionId: session.session?.id,
        notes: cart.notes,
      });
      cart.clearCart();
      toast.success(`تم تعليق الفاتورة: ${held.code}`);
    } catch (e: any) {
      toast.error(friendlyError(e, "فشل تعليق الفاتورة"));
    }
  }, [cart, session]);

  const handleClear = useCallback(() => {
    if (window.confirm("هل تريد مسح السلة بالكامل؟")) {
      cart.clearCart();
    }
  }, [cart]);

  const loadHold = useCallback(
    async (holdRef: string) => {
      try {
        const held = await utils.modules.pos.getHold.fetch({ code: holdRef });
        if (!held) {
          toast.error("لم يتم العثور على الفاتورة المعلقة");
          return;
        }
        const snap =
          typeof held.snapshot === "string"
            ? JSON.parse(held.snapshot)
            : held.snapshot;
        cart.restoreSnapshot(snap);
        cart.setHoldId(String(held.id));
        await session.resumeHold(held.id);
        setShowHolds(false);
        toast.success(`تم استعادة الفاتورة المعلقة: ${held.code}`);
      } catch (e: any) {
        toast.error(friendlyError(e, "فشل استعادة الفاتورة المعلقة"));
      }
    },
    [utils, cart, session]
  );

  const handleDeleteHold = useCallback(
    async (holdId: number, holdCode: string) => {
      if (!window.confirm(`هل تريد حذف الفاتورة المعلقة ${holdCode}؟`)) return;
      try {
        await session.deleteHold(holdId);
        toast.success(`تم حذف الفاتورة المعلقة: ${holdCode}`);
      } catch (e: any) {
        toast.error(friendlyError(e, "فشل حذف الفاتورة المعلقة"));
      }
    },
    [session]
  );

  // Stage the invoice for pre-save review (validate → edit → confirm)
  const handleCompleteSale = useCallback(() => {
    const submission = cart.getCartForSubmission();

    // Show total on customer display before payment
    if (selectedDisplayId) {
      updateCustomerDisplay({
        type: "total",
        lines: [
          "الإجمالي:",
          formatCurrency(submission.summary?.total || 0, config.currency),
        ],
        amount: submission.summary?.total || 0,
        currency: config.currency,
        duration: 5000,
      });
    }

    setReviewHeader({
      customerId: submission.customerId,
      paymentMethod: submission.paymentMethod,
      paidAmount: String(submission._paidNow ?? submission.paidAmount ?? 0),
      discount: String(submission.discount || 0),
      taxRate: String(submission.taxRate || "0"),
      currency: config.currency,
      currencyRate: "1",
      notes: submission.notes ?? "",
      warehouseId: config.defaultWarehouseId ?? null,
    });
    setReviewLines(
      submission.items.map(i => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: String(i.unitPrice),
        discount: String(i.discount ?? "0"),
        taxPct: Number(i.taxRate ?? 0),
        unitId: (i as any).unitId ?? undefined,
        unitName: (i as any).unitName ?? undefined,
      }))
    );
    setShowSaleReview(true);
  }, [
    cart,
    selectedDisplayId,
    updateCustomerDisplay,
    config.currency,
    config.defaultWarehouseId,
  ]);

  // Confirm from the review dialog — re-read the cart lines the user may have edited
  const submitReviewedSale = useCallback(
    (confirmedLines: InvoicePreviewLine[]) => {
      const splitPayments =
        Array.isArray(cart.payments) && cart.payments.length > 0
          ? cart.payments
          : [];

      createSaleMutation.mutate({
        customerId: reviewHeader.customerId,
        items: confirmedLines.map(i => ({
          productId: i.productId,
          productName: i.productName ?? "",
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount ?? "0",
          taxPct: i.taxPct,
          unitId: i.unitId,
        })),
        paymentMethod: reviewHeader.paymentMethod as any,
        paidAmount: String(
          confirmedLines.reduce(
            (s, l) =>
              s +
              Number(l.quantity || 0) * Number(l.unitPrice || 0) -
              Number(l.discount || 0),
            0
          )
        ),
        payments:
          splitPayments.length > 0
            ? splitPayments.map(p => ({
                method: p.method,
                amount: String(p.amount),
                reference: p.reference,
              }))
            : undefined,
        discount: reviewHeader.discount,
        taxRate: reviewHeader.taxRate,
        notes: reviewHeader.notes,
        sessionId: session.session?.id,
        holdId: cart.holdId ? Number(cart.holdId) || undefined : undefined,
        loyaltyPointsRedeemed: cart.loyaltyPointsRedeemed || undefined,
        currency: reviewHeader.currency,
        currencyRate: reviewHeader.currencyRate,
      });
      setShowSaleReview(false);
    },
    [cart, createSaleMutation, reviewHeader, session.session?.id]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case "F1":
          e.preventDefault();
          cart.clearCart();
          break;
        case "F2":
          e.preventDefault();
          handleHold();
          break;
        case "F3":
          e.preventDefault();
          setShowHolds(true);
          break;
        case "F4":
          e.preventDefault();
          setShowScanner(!showScanner);
          break;
        case "F5":
          e.preventDefault();
          setShowNotifications(!showNotifications);
          break;
        case "F6":
          e.preventDefault();
          setShowDaily(!showDaily);
          break;
        case "F7":
          e.preventDefault();
          setViewMode(v => (v === "grid" ? "list" : "grid"));
          break;
        case "F8":
          e.preventDefault();
          setShowSettings(!showSettings);
          break;
        case "F9":
          e.preventDefault();
          if (cart.canCompleteSale) handleCompleteSale();
          break;
        case "F10":
          e.preventDefault();
          setKeyboardShortcuts(true);
          break;
        case "F11":
          e.preventDefault();
          if (selectedPrinterId) {
            printReceiptRef.current(
              "TEST-" + Date.now(),
              cart.getCartForSubmission()
            );
          }
          break;
        case "F12":
          e.preventDefault();
          if (selectedDrawerId) {
            openCashDrawerRef.current("اختبار يدوي");
          }
          break;
        case "Escape":
          setShowScanner(false);
          setShowHolds(false);
          setShowNotifications(false);
          setShowDaily(false);
          setShowSettings(false);
          setKeyboardShortcuts(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    cart,
    showScanner,
    showHolds,
    showNotifications,
    showDaily,
    showSettings,
    handleHold,
    handleCompleteSale,
    selectedPrinterId,
    selectedDrawerId,
  ]);

  const printInvoice = async (invoiceNumber: string) => {
    const submission = cart.getCartForSubmission();
    await printReceipt(invoiceNumber, submission);
  };

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AppSidebar />
      <main className="flex-1 p-4 md:p-6 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-brand">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                نقاط البيع المتقدم
              </h1>
              <p className="text-[11px] text-muted-foreground">
                نظام كاشير احترافي مع دعم الباركود، طرق دفع متعددة، وإدارة
                ورديات
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Hardware Status Indicators */}
            <div className="flex items-center gap-1 ml-2 md:ml-4 border-r border-border pr-2 md:pr-4 hidden sm:flex">
              {selectedPrinterId && (
                <span
                  className="flex items-center gap-1 text-[10px] text-emerald-600"
                  title="طابعة متصلة"
                >
                  <Printer className="h-3.5 w-3.5" />
                </span>
              )}
              {selectedDrawerId && (
                <span
                  className="flex items-center gap-1 text-[10px] text-emerald-600"
                  title="درج نقود متصل"
                >
                  <HardDrive className="h-3.5 w-3.5" />
                </span>
              )}
              {selectedScannerId && (
                <span
                  className="flex items-center gap-1 text-[10px] text-emerald-600"
                  title="قارئ باركود متصل"
                >
                  <Barcode className="h-3.5 w-3.5" />
                </span>
              )}
              {selectedDisplayId && (
                <span
                  className="flex items-center gap-1 text-[10px] text-emerald-600"
                  title="شاشة عميل متصلة"
                >
                  <Monitor className="h-3.5 w-3.5" />
                </span>
              )}
              {selectedPinPadId && (
                <span
                  className="flex items-center gap-1 text-[10px] text-emerald-600"
                  title="جهاز دفع متصل"
                >
                  <PinPadIcon className="h-3.5 w-3.5" />
                </span>
              )}
              {selectedScaleId && (
                <span
                  className="flex items-center gap-1 text-[10px] text-emerald-600"
                  title="ميزان متصل"
                >
                  <Scale className="h-3.5 w-3.5" />
                </span>
              )}
              {!selectedPrinterId &&
                !selectedDrawerId &&
                !selectedScannerId &&
                !selectedDisplayId &&
                !selectedPinPadId &&
                !selectedScaleId && (
                  <span
                    className="flex items-center gap-1 text-[10px] text-muted-foreground"
                    title="لا توجد أجهزة متصلة"
                  >
                    <WifiOff className="h-3.5 w-3.5" />
                  </span>
                )}
            </div>

            {lastInvoice && (
              <span className="inline-flex items-center gap-1 rounded-full bg-teal-600/10 px-3 py-1 text-[11px] font-bold text-teal-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {lastInvoice}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDaily(!showDaily)}
            >
              <Calendar className="h-3.5 w-3.5 mr-1" /> تقرير اليوم
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              <Bell className="h-3.5 w-3.5 mr-1" />
              تنبيهات{" "}
              {notifications.unreadCount > 0 && (
                <span className="ml-1 h-4 w-4 rounded-full bg-destructive text-[10px] flex items-center justify-center">
                  {notifications.unreadCount}
                </span>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHolds(true)}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              فواتير معلقة {holdsData.items.length}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setKeyboardShortcuts(true)}
            >
              <Zap className="h-3.5 w-3.5 mr-1" />
              اختصارات
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-3.5 w-3.5 mr-1" />
              إعدادات
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between rounded-xl border border-border bg-card px-4 py-2">
          <div className="flex items-center gap-2 text-[12px]">
            <span
              className={`h-2.5 w-2.5 rounded-full ${session.isSessionOpen ? "bg-emerald-500" : session.isSessionSuspended ? "bg-amber-500" : "bg-rose-400"}`}
            />
            {session.isSessionOpen && session.session && (
              <span className="text-foreground">
                وردية مفتوحة:{" "}
                <span className="font-mono font-bold">
                  {session.session.code}
                </span>
                <span className="mx-2">|</span>
                <span className="font-mono">
                  {formatCurrency(
                    session.report?.totalSales ?? session.session.totalSales,
                    config.currency,
                    config.decimals
                  )}
                </span>
                <span className="mx-2">|</span>
                <span>
                  {session.report?.invoiceCount ?? session.session.invoiceCount}{" "}
                  فاتورة
                </span>
              </span>
            )}
            {!session.isSessionOpen && !session.isSessionSuspended && (
              <span className="text-muted-foreground">
                لا توجد وردية كاشير مفتوحة
              </span>
            )}
            {session.isSessionSuspended && session.session && (
              <span className="text-amber-600">
                وردية معلقة:{" "}
                <span className="font-mono font-bold">
                  {session.session.code}
                </span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {session.isSessionOpen ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => session.closeSession()}
                disabled={session.isLoading}
              >
                إغلاق الوردية
              </Button>
            ) : session.isSessionSuspended ? (
              <Button
                size="sm"
                onClick={() => session.resumeSession()}
                disabled={session.isLoading}
              >
                استئناف الوردية
              </Button>
            ) : (
              <Button
                size="sm"
                className="bg-brand text-ink-deep hover:bg-brand-deep hover:text-sand"
                onClick={() => session.openSession()}
                disabled={session.isLoading}
              >
                فتح وردية
              </Button>
            )}
          </div>
        </div>

        {showDaily && daily.data && (
          <div className="rounded-2xl border border-border bg-card p-4 animate-in slide-in-from-top-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                ملخص المبيعات — {(daily.data as any).date}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDaily(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {Object.entries((daily.data as any).byMethod ?? {}).map(
                ([k, v]) => {
                  const method = enabledPaymentMethods.find(m => m.key === k);
                  return (
                    <div
                      key={k}
                      className="rounded-xl bg-muted/40 p-3 text-center"
                    >
                      <div className="text-[10px] text-muted-foreground">
                        {method?.labelAr || k}
                      </div>
                      <div className="text-sm font-bold text-foreground">
                        {formatCurrency(
                          Number(v) || 0,
                          config.currency,
                          config.decimals
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
            {((daily.data as any).topProducts?.length ?? 0) > 0 && (
              <div className="mt-4">
                <h3 className="mb-2 text-xs font-bold text-muted-foreground">
                  الأكثر مبيعاً
                </h3>
                <ul className="space-y-1">
                  {(daily.data as any).topProducts.slice(0, 5).map((p: any) => (
                    <li
                      key={p.productId}
                      className="flex items-center justify-between text-[12px]"
                    >
                      <span className="text-foreground">{p.productName}</span>
                      <span className="text-muted-foreground">
                        {p.qty} ×{" "}
                        {formatCurrency(
                          p.revenue,
                          config.currency,
                          config.decimals
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {showNotifications && (
          <div className="rounded-2xl border border-border bg-card p-4 animate-in slide-in-from-top-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">التنبيهات</h2>
              <div className="flex items-center gap-2">
                {notifications.unreadCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => notifications.markAllAsRead()}
                  >
                    قراءة الكل
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {notifications.notifications.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  لا توجد تنبيهات
                </p>
              ) : (
                notifications.notifications.map(n => (
                  <div
                    key={n.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border ${n.read ? "bg-muted/30" : "bg-blue-50 border-blue-200"}`}
                    onClick={() => notifications.markAsRead(n.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {n.titleAr || n.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {n.messageAr || n.message}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.timestamp).toLocaleString("ar-YE")}
                      </div>
                    </div>
                    {!n.read && (
                      <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {showSettings && (
          <div className="rounded-2xl border border-border bg-card p-4 animate-in slide-in-from-top-2 max-w-4xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                إعدادات نقاط البيع
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSettings(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="general">عام</TabsTrigger>
                <TabsTrigger value="policy">سياسات</TabsTrigger>
                <TabsTrigger value="hardware">الأجهزة</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      قالب العرض
                    </label>
                    <Select
                      value={config.template}
                      onValueChange={v =>
                        updateSettingsMutation.mutate({
                          posConfig: { ...config, template: v as any },
                        } as any)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">قياسي</SelectItem>
                        <SelectItem value="compact">مضغوط</SelectItem>
                        <SelectItem value="minimal">بسيط</SelectItem>
                        <SelectItem value="restaurant">مطعم</SelectItem>
                        <SelectItem value="retail">تجزئة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      الأعمدة
                    </label>
                    <Select
                      value={config.columns.toString()}
                      onValueChange={v =>
                        updateSettingsMutation.mutate({
                          posConfig: { ...config, columns: parseInt(v) },
                        } as any)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                        <SelectItem value="4">4</SelectItem>
                        <SelectItem value="5">5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showStock"
                      checked={config.showStock}
                      onChange={e =>
                        updateSettingsMutation.mutate({
                          posConfig: { ...config, showStock: e.target.checked },
                        } as any)
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="showStock" className="text-sm">
                      إظهار المخزون
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="showCategories"
                      checked={config.showCategories}
                      onChange={e =>
                        updateSettingsMutation.mutate({
                          posConfig: {
                            ...config,
                            showCategories: e.target.checked,
                          },
                        } as any)
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="showCategories" className="text-sm">
                      إظهار التصنيفات
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="soundEnabled"
                      checked={config.soundEnabled}
                      onChange={e =>
                        updateSettingsMutation.mutate({
                          posConfig: {
                            ...config,
                            soundEnabled: e.target.checked,
                          },
                        } as any)
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="soundEnabled" className="text-sm">
                      أصوات التنبيهات
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="vibrationEnabled"
                      checked={config.vibrationEnabled}
                      onChange={e =>
                        updateSettingsMutation.mutate({
                          posConfig: {
                            ...config,
                            vibrationEnabled: e.target.checked,
                          },
                        } as any)
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="vibrationEnabled" className="text-sm">
                      اهتزاز عند المسح
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="autoPrint"
                      checked={config.autoPrint}
                      onChange={e =>
                        updateSettingsMutation.mutate({
                          posConfig: { ...config, autoPrint: e.target.checked },
                        } as any)
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="autoPrint" className="text-sm">
                      طباعة تلقائية
                    </label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="policy" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowPriceOverride"
                      checked={salesPolicy.allowPriceOverride}
                      onChange={e =>
                        updateSettingsMutation.mutate({
                          salesPolicy: {
                            ...salesPolicy,
                            allowPriceOverride: e.target.checked,
                          },
                        } as any)
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="allowPriceOverride" className="text-sm">
                      السماح بتعديل السعر
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allowNegativeStock"
                      checked={salesPolicy.allowNegativeStock}
                      onChange={e =>
                        updateSettingsMutation.mutate({
                          salesPolicy: {
                            ...salesPolicy,
                            allowNegativeStock: e.target.checked,
                          },
                        } as any)
                      }
                      className="h-4 w-4"
                    />
                    <label htmlFor="allowNegativeStock" className="text-sm">
                      السماح بمخزون سالب
                    </label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="hardware" className="space-y-4">
                {/* Hardware Discovery */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      الأجهزة المتصلة
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={discoverDevices}
                        disabled={isDiscoveringDevices}
                        className="gap-1"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${isDiscoveringDevices ? "animate-spin" : ""}`}
                        />
                        {isDiscoveringDevices
                          ? "جاري البحث..."
                          : "إعادة اكتشاف"}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {hardwareError && (
                      <div className="mb-4 p-3 rounded bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                        {hardwareError}
                      </div>
                    )}
                    {hardwareDevices.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Search className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>لم يتم اكتشاف أي أجهزة</p>
                        <p className="text-xs mt-1">
                          اضغط على "إعادة اكتشاف" للبحث عن الأجهزة المتصلة
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {hardwareDevices.map(device => (
                          <div
                            key={device.id}
                            className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30"
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                {getConnectionTypeIcon(device.connectionType)}
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {device.name}
                                </div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  <span>{getDeviceTypeLabel(device.type)}</span>
                                  <span>•</span>
                                  <span>
                                    {device.connectionType.toUpperCase()}
                                  </span>
                                  {device.vendorId && device.productId && (
                                    <span>
                                      VID:
                                      {device.vendorId
                                        .toString(16)
                                        .toUpperCase()}{" "}
                                      PID:
                                      {device.productId
                                        .toString(16)
                                        .toUpperCase()}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(device.status)}
                              {device.status === "disconnected" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => connectDevice(device.id)}
                                  className="h-7 gap-1"
                                >
                                  <Wifi className="h-3.5 w-3.5" />
                                  ربط
                                </Button>
                              )}
                              {device.status === "connected" && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => disconnectDevice(device.id)}
                                  className="h-7 gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <WifiOff className="h-3.5 w-3.5" />
                                  فصل
                                </Button>
                              )}
                              {device.status === "error" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => connectDevice(device.id)}
                                  className="h-7 gap-1 border-destructive text-destructive hover:bg-destructive/10"
                                >
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  إعادة محاولة
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Device Selection */}
                <Card>
                  <CardHeader>
                    <CardTitle>الأجهزة المحددة للعمليات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {[
                        {
                          type: "printer",
                          label: "طابعة الإيصالات",
                          icon: Printer,
                          value: selectedPrinterId,
                          onChange: setSelectedPrinterId,
                        },
                        {
                          type: "cash_drawer",
                          label: "درج النقود",
                          icon: HardDrive,
                          value: selectedDrawerId,
                          onChange: setSelectedDrawerId,
                        },
                        {
                          type: "barcode_scanner",
                          label: "قارئ الباركود",
                          icon: Barcode,
                          value: selectedScannerId,
                          onChange: setSelectedScannerId,
                        },
                        {
                          type: "customer_display",
                          label: "شاشة العميل",
                          icon: Monitor,
                          value: selectedDisplayId,
                          onChange: setSelectedDisplayId,
                        },
                        {
                          type: "pin_pad",
                          label: "جهاز الدفع",
                          icon: PinPadIcon,
                          value: selectedPinPadId,
                          onChange: setSelectedPinPadId,
                        },
                        {
                          type: "scale",
                          label: "الميزان",
                          icon: Scale,
                          value: selectedScaleId,
                          onChange: setSelectedScaleId,
                        },
                      ].map(({ type, label, icon: Icon, value, onChange }) => (
                        <div
                          key={type}
                          className="p-3 rounded-lg border border-border bg-muted/30"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                            <span className="font-medium text-sm">{label}</span>
                          </div>
                          <Select value={value || ""} onValueChange={onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر جهاز..." />
                            </SelectTrigger>
                            <SelectContent>
                              {hardwareDevices
                                .filter(d => d.type === type)
                                .map(d => (
                                  <SelectItem key={d.id} value={d.id}>
                                    {d.name}{" "}
                                    {d.status === "connected" && (
                                      <Check className="h-3 w-3 ml-1 text-emerald-500" />
                                    )}
                                  </SelectItem>
                                ))}
                              {hardwareDevices.filter(d => d.type === type)
                                .length === 0 && (
                                <SelectItem value="" disabled>
                                  لا توجد أجهزة من هذا النوع
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          {value &&
                            hardwareDevices.find(d => d.id === value)
                              ?.status !== "connected" && (
                              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> الجهاز غير
                                متصل
                              </p>
                            )}
                        </div>
                      ))}
                    </div>

                    {/* Test Actions */}
                    <Separator className="my-4" />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() =>
                          selectedPrinterId &&
                          printReceipt("TEST-001", {
                            items: [],
                            summary: { total: 0 },
                            payments: [],
                            customer: null,
                          })
                        }
                        disabled={!selectedPrinterId}
                        className="gap-1"
                      >
                        <Printer className="h-4 w-4" />
                        طباعة اختبار
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          selectedDrawerId &&
                          openCashDrawer("اختبار درج النقود")
                        }
                        disabled={!selectedDrawerId}
                        className="gap-1"
                      >
                        <HardDrive className="h-4 w-4" />
                        فتح درج النقود
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          selectedDisplayId &&
                          updateCustomerDisplay({
                            type: "welcome",
                            lines: [
                              "اختبار شاشة العميل",
                              settingsData?.institutionName || "اسم المنشأة",
                            ],
                            duration: 3000,
                          })
                        }
                        disabled={!selectedDisplayId}
                        className="gap-1"
                      >
                        <Monitor className="h-4 w-4" />
                        اختبار شاشة العميل
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          selectedPinPadId && processCardPayment(1, "TEST")
                        }
                        disabled={!selectedPinPadId}
                        className="gap-1"
                      >
                        <PinPadIcon className="h-4 w-4" />
                        اختبار جهاز الدفع
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          selectedScaleId &&
                          readScaleWeight().then(
                            r =>
                              r && toast.success(`الوزن: ${r.weight} ${r.unit}`)
                          )
                        }
                        disabled={!selectedScaleId}
                        className="gap-1"
                      >
                        <Scale className="h-4 w-4" />
                        قراءة الميزان
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => selectedScaleId && tareScale()}
                        disabled={!selectedScaleId}
                        className="gap-1"
                      >
                        <RotateCcw className="h-4 w-4" />
                        تصفير الميزان
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Hardware Configuration */}
                <Card>
                  <CardHeader>
                    <CardTitle>إعدادات متقدمة</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="receiptHeader"
                          className="text-sm font-medium"
                        >
                          رأس الإيصال
                        </Label>
                        <Input
                          id="receiptHeader"
                          placeholder={
                            settingsData?.institutionName || "اسم المنشأة"
                          }
                          value={
                            config.receiptHeader ||
                            settingsData?.institutionName ||
                            "اسم المنشأة"
                          }
                          onChange={e =>
                            updateSettingsMutation.mutate({
                              posConfig: {
                                ...config,
                                receiptHeader: e.target.value,
                              },
                            } as any)
                          }
                        />
                      </div>
                      <div>
                        <Label
                          htmlFor="receiptFooter"
                          className="text-sm font-medium"
                        >
                          تذييل الإيصال
                        </Label>
                        <Input
                          id="receiptFooter"
                          placeholder="شكراً لتعاملكم معنا"
                          value={config.receiptFooter || "شكراً لتعاملكم معنا"}
                          onChange={e =>
                            updateSettingsMutation.mutate({
                              posConfig: {
                                ...config,
                                receiptFooter: e.target.value,
                              },
                            } as any)
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label
                          htmlFor="printDensity"
                          className="text-sm font-medium"
                        >
                          كثافة الطباعة
                        </Label>
                        <Select
                          value={(config.printDensity || 12).toString()}
                          onValueChange={v =>
                            updateSettingsMutation.mutate({
                              posConfig: {
                                ...config,
                                printDensity: parseInt(v),
                              },
                            } as any)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="8">منخفضة (8)</SelectItem>
                            <SelectItem value="10">متوسطة (10)</SelectItem>
                            <SelectItem value="12">عالية (12)</SelectItem>
                            <SelectItem value="14">أعلى (14)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label
                          htmlFor="paperWidth"
                          className="text-sm font-medium"
                        >
                          عرض الورق
                        </Label>
                        <Select
                          value={config.paperWidth || "80"}
                          onValueChange={v =>
                            updateSettingsMutation.mutate({
                              posConfig: { ...config, paperWidth: v },
                            } as any)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="58">58 مم</SelectItem>
                            <SelectItem value="80">80 مم</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="cutPaper"
                        checked={config.cutPaper !== false}
                        onChange={e =>
                          updateSettingsMutation.mutate({
                            posConfig: {
                              ...config,
                              cutPaper: e.target.checked,
                            },
                          } as any)
                        }
                        className="h-4 w-4"
                      />
                      <label htmlFor="cutPaper" className="text-sm">
                        قص الورق تلقائياً
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {showHolds && holdsData.items && (
          <div className="rounded-2xl border border-border bg-card p-4 animate-in slide-in-from-top-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-foreground">
                الفواتير المعلقة
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowHolds(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {holdsData.items.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  لا توجد فواتير معلقة
                </p>
              ) : (
                holdsData.items.map((hold: any) => (
                  <div
                    key={hold.id}
                    className="flex items-center justify-between p-2 rounded-lg border border-border bg-muted/30"
                  >
                    <div>
                      <div className="font-medium">{hold.holdId}</div>
                      <div className="text-xs text-muted-foreground">
                        {hold.itemCount} أصناف •{" "}
                        {formatCurrency(
                          hold.total,
                          config.currency,
                          config.decimals
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => loadHold(hold.holdId)}
                      >
                        استعادة
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteHold(hold.id, hold.holdId)}
                      >
                        حذف
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {keyboardShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card rounded-2xl p-6 w-full max-w-md animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">اختصارات لوحة المفاتيح</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setKeyboardShortcuts(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="space-y-2 text-sm">
                {[
                  ["F1", "مسح السلة"],
                  ["F2", "تعليق الفاتورة"],
                  ["F3", "عرض الفواتير المعلقة"],
                  ["F4", "فتح/إغلاق الماسح"],
                  ["F5", "فتح/إغلاق التنبيهات"],
                  ["F6", "عرض تقرير اليوم"],
                  ["F7", "تبديل عرض المنتجات"],
                  ["F8", "فتح الإعدادات"],
                  ["F9", "إتمام البيع"],
                  ["F10", "عرض الاختصارات"],
                  ["F11", "طباعة اختبار (طابعة)"],
                  ["F12", "فتح درج النقود"],
                  ["Esc", "إغلاق النوافذ"],
                ].map(([key, desc]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-1 border-b border-border/50"
                  >
                    <kbd className="px-2 py-0.5 rounded bg-muted border border-border font-mono text-xs">
                      {key}
                    </kbd>
                    <span>{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card rounded-2xl p-6 w-full max-w-md animate-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">مسح الباركود بالكاميرا</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowScanner(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="relative aspect-video rounded-lg bg-black overflow-hidden mb-3">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                />
                {scannerError && (
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-red-500/90 text-white text-sm">
                    {scannerError}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowScanner(false)}
                >
                  إيقاف
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => scannerRef.current?.toggleTorch(true)}
                >
                  تشغيل الفلاش
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col-reverse gap-4 lg:flex-row-reverse">
          <Cart
            lines={cart.cart}
            onQuantityChange={cart.updateQuantity}
            onDiscountChange={cart.setLineDiscount}
            onPriceChange={cart.setLinePrice}
            onRemove={cart.removeLine}
            onUnitChange={cart.setUnit as any}
            getProductUnits={cart.fetchProductUnits as any}
            allowPriceOverride={salesPolicy.allowPriceOverride}
            allowQuantityOverride={salesPolicy.allowQuantityOverride}
            maxDiscountPercent={salesPolicy.maxDiscountPercent}
            maxLineDiscountPercent={salesPolicy.maxLineDiscountPercent}
            currency={config.currency}
            decimals={config.decimals}
            selectedCustomer={cart.selectedCustomer as any}
            loyaltyPointsRedeemed={cart.loyaltyPointsRedeemed}
            onLoyaltyPointsChange={cart.setLoyaltyPointsRedeemed}
            globalDiscount={cart.globalDiscount}
            globalDiscountPercent={cart.globalDiscountPercent}
            onGlobalDiscountChange={(v, isPercent) =>
              isPercent
                ? cart.setGlobalDiscountPercent(v)
                : cart.setGlobalDiscount(v)
            }
            notes={cart.notes}
            onNotesChange={cart.setNotes}
            holdId={cart.holdId}
            onHoldIdChange={cart.setHoldId}
            summary={cart.summary}
            due={cart.due}
            change={cart.change}
            paymentMethod={cart.paymentMethod}
            onPaymentMethodChange={cart.setPaymentMethod as any}
            payments={cart.payments}
            onAddPayment={cart.addPayment as any}
            onRemovePayment={cart.removePayment}
            canCompleteSale={cart.canCompleteSale}
            onCompleteSale={handleCompleteSale}
            onHold={handleHold}
            onClear={handleClear}
            isProcessing={createSaleMutation.isPending}
          />

          <ProductCatalog
            products={productSearch.products}
            isLoading={productSearch.isLoading}
            error={productSearch.error}
            hasMore={productSearch.hasMore}
            onLoadMore={productSearch.loadMore}
            onSearch={productSearch.setQuery}
            onBarcodeScan={handleBarcodeScan}
            onCategoryChange={productSearch.setQuery as any}
            onAddToCart={cart.addToCart}
            categories={productSearch.categories.map((c, i) => ({
              id: i,
              name: c.name,
              productCount: c.count,
            }))}
            selectedCategory={null}
            searchQuery={productSearch.query}
            currency={config.currency}
            decimals={config.decimals}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showStock={config.showStock}
            showCategories={config.showCategories}
            columns={config.columns}
          />

          {/* مراجعة الفاتورة قبل الحفظ النهائي */}
          <InvoicePreviewDialog
            open={showSaleReview}
            onOpenChange={setShowSaleReview}
            kind="sale"
            title="مراجعة فاتورة البيع قبل الحفظ"
            description="راجع البنود والإجماليات، وعدّل الكمية أو السعر أو الخصم أو احذف بنداً قبل الحفظ."
            lines={reviewLines}
            onLinesChange={setReviewLines}
            header={reviewHeader}
            onCancel={() => {
              setShowSaleReview(false);
              toast.info("عدت إلى السلة لإجراء التعديلات");
            }}
            onConfirm={submitReviewedSale}
            isSaving={createSaleMutation.isPending}
            confirmLabel="تأكيد وحفظ الفاتورة"
          />
        </div>
      </main>
    </div>
  );
}
