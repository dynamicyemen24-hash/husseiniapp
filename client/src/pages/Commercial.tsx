import { useState, useMemo, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { friendlyError } from "@/lib/friendlyErrors";
import { useDebounce } from "@/hooks/useDebounce";
import {
  downloadInvoiceImportTemplate,
  parseInvoiceImportFile,
} from "@/lib/invoiceImport";
import { ProductPicker } from "@/components/ProductPicker";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import { CustomFields } from "@/components/CustomFields";
import {
  InvoicePreviewDialog,
  type InvoicePreviewLine,
} from "@/components/InvoicePreviewDialog";
import { EntityDocuments } from "@/components/EntityDocuments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Users,
  Truck,
  ShoppingCart,
  ShoppingBag,
  ClipboardList,
  Plus,
  Search,
  Edit,
  Barcode,
  MapPin,
  Phone,
  User,
  Trash2,
  PackagePlus,
  CheckCircle,
  Printer,
  Wallet,
  Loader2,
  Upload,
  Download,
  ReceiptText,
  Tag,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";

async function prepareInvoiceImage(
  file: File
): Promise<{ imageDataUrl: string; mimeType: "image/jpeg" }> {
  if (!file.type.startsWith("image/"))
    throw new Error("Ø§Ø®ØªØ± Ù…Ù„Ù ØµÙˆØ±Ø© ØµØ§Ù„Ø­Ø§Ù‹");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("ØªØ¹Ø°Ø± ØªØ¬Ù‡ÙŠØ² Ø§Ù„ØµÙˆØ±Ø©");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.72, 0.58, 0.45]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (dataUrl.length <= 70_000)
      return { imageDataUrl: dataUrl, mimeType: "image/jpeg" };
  }
  throw new Error(
    "Ø§Ù„ØµÙˆØ±Ø© ÙƒØ¨ÙŠØ±Ø©Ø› Ø§Ù„ØªÙ‚Ø·Ù‡Ø§ Ø¨Ø¥Ø¶Ø§Ø¡Ø© Ø¬ÙŠØ¯Ø© Ø£Ùˆ Ø§Ø®ØªØ± ØµÙˆØ±Ø© Ø£ØµØºØ±"
  );
}
import { statusColors, statusLabels } from "./commercial/lib/status-maps";
import {
  exportProductsCsv,
  downloadProductTemplate,
  parseProductCsv,
} from "./commercial/lib/csv-helpers";
import { fmtNum } from "@/lib/format";
import {
  printPaymentReceipt,
  printSaleInvoice,
} from "./commercial/lib/print-helpers";

type Tab =
  | "products"
  | "customers"
  | "suppliers"
  | "sales"
  | "purchases"
  | "orders"
  | "offers";

const PAGE_SIZE = 50;

export default function Commercial() {
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Products
  const {
    data: productsResponse,
    refetch: refetchProducts,
    isLoading: loadingProducts,
  } = trpc.products.list.useQuery(
    {
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const productsData = productsResponse?.items ?? [];
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [productForm, setProductForm] = useState<any>({
    code: "",
    name: "",
    category: "",
    unit: "Ù‚Ø·Ø¹Ø©",
    productType: "goods",
    purchasePrice: "0",
    salePrice: "0",
    minStock: 0,
    barcode: "",
    unitOfMeasure: "",
    secondaryUnit: "",
    conversionFactor: "1",
    isComposite: false,
    bom: "[]",
    alternativeIds: "[]",
    attachmentUrl: "",
    costMethod: "fixed",
    directCost: "0",
    indirectCost: "0",
    productionMinutes: "0",
    priceMode: "margin",
    marginPct: "20",
    salesAccountId: undefined as number | undefined,
    cogsAccountId: undefined as number | undefined,
    inventoryAccountId: undefined as number | undefined,
  });
  const importProductsCsv = trpc.products.importCsv.useMutation({
    onSuccess: () => {
      toast.success(
        `ØªÙ… Ø§Ø³ØªÙŠØ±Ø§Ø¯ ${importRows?.length ?? 0} ØµÙ†ÙØ§Ù‹ Ø¨Ù†Ø¬Ø§Ø­`
      );
      setShowImportDialog(false);
      setImportRows(null);
      setImportFileName("");
      refetchProducts();
    },
    onError: e => toast.error(`ÙØ´Ù„ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯: ${e.message}`),
  });

  const handleImportProducts = () => {
    if (!importRows || importRows.length === 0) {
      toast.error("Ù„Ø§ ØªÙˆØ¬Ø¯ ØµÙÙˆÙ Ù„Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯");
      return;
    }
    const formattedRows = importRows.map((r: any, idx: number) => ({
      code: r.code || `ITM-${idx + 1}`,
      name: r.name || "ØµÙ†Ù Ø¨Ø¯ÙˆÙ† Ø§Ø³Ù…",
      type: (r.type === "service" ? "service" : "goods") as "goods" | "service",
      category: r.category || undefined,
      unit: r.unit || "Ù‚Ø·Ø¹Ø©",
      purchasePrice: String(r.purchasePrice || "0"),
      salePrice: String(r.salePrice || "0"),
      wholesalePrice: String(r.wholesalePrice || "0"),
      currentStock: parseInt(r.currentStock || "0", 10) || 0,
      minStock: parseInt(r.minStock || "0", 10) || 0,
      barcode: r.barcode || undefined,
    }));
    importProductsCsv.mutate({ rows: formattedRows });
  };

  const createProduct = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…Ù†ØªØ¬");
      refetchProducts();
      setShowProductDialog(false);
      setProductForm({
        code: "",
        name: "",
        category: "",
        unit: "Ù‚Ø·Ø¹Ø©",
        productType: "goods",
        purchasePrice: "0",
        salePrice: "0",
        minStock: 0,
        barcode: "",
        unitOfMeasure: "",
        secondaryUnit: "",
        conversionFactor: "1",
        isComposite: false,
        bom: "[]",
        alternativeIds: "[]",
        attachmentUrl: "",
        costMethod: "fixed",
        directCost: "0",
        indirectCost: "0",
        productionMinutes: "0",
        priceMode: "margin",
        marginPct: "20",
        salesAccountId: undefined,
        cogsAccountId: undefined,
        inventoryAccountId: undefined,
      });
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const isCreatingProduct = createProduct.isPending;

  const [editProduct, setEditProduct] = useState<any>(null);
  const [editProductForm, setEditProductForm] = useState<any>({
    id: 0,
    name: "",
    salePrice: "",
    purchasePrice: "",
    minStock: 0,
    barcode: "",
    productType: "goods",
    unitOfMeasure: "",
    secondaryUnit: "",
    conversionFactor: "1",
    isComposite: false,
    bom: "[]",
    alternativeIds: "[]",
    attachmentUrl: "",
    costMethod: "fixed",
    directCost: "0",
    indirectCost: "0",
    productionMinutes: "0",
    priceMode: "margin",
    marginPct: "20",
    salesAccountId: undefined as number | undefined,
    cogsAccountId: undefined as number | undefined,
    inventoryAccountId: undefined as number | undefined,
  });
  const accountsQuery = trpc.accounting.getAccounts.useQuery();
  const updateProduct = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ù†ØªØ¬");
      setEditProduct(null);
      refetchProducts();
    },
    onError: e => toast.error(friendlyError(e)),
  });

  const [adjustProduct, setAdjustProduct] = useState<any>(null);
  const [adjustForm, setAdjustForm] = useState({
    quantity: 1,
    type: "in" as "in" | "out" | "adjustment",
    notes: "",
  });
  const adjustStock = trpc.products.adjustStock.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†");
      setAdjustProduct(null);
      refetchProducts();
    },
    onError: e => toast.error(friendlyError(e)),
  });

  const customerNameOf = (id: number | null | undefined) => {
    if (!id) return "Ø¹Ù…ÙŠÙ„ Ù†Ù‚Ø¯ÙŠ";
    return (
      customersData.find(c => c.id === id)?.name ?? `Ø¹Ù…ÙŠÙ„ Ø±Ù‚Ù… ${id}`
    );
  };
  const supplierNameOf = (id: number | null | undefined) => {
    if (!id) return "Ù…ÙˆØ±Ø¯ Ù†Ù‚Ø¯ÙŠ";
    return (
      suppliersData.find(s => s.id === id)?.name ?? `Ù…ÙˆØ±Ø¯ Ø±Ù‚Ù… ${id}`
    );
  };
  const isWebOrder = (o: any) => String(o.orderNumber || "").startsWith("WEB-");

  // CSV Import/Export (Ø§Ù„Ø£ØµÙ†Ø§Ù ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª)
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importRows, setImportRows] = useState<any[] | null>(null);
  const [importFileName, setImportFileName] = useState("");
  const onImportFile = (file: File | null) => {
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const { rows } = parseProductCsv(String(reader.result || ""));
      setImportRows(rows.length > 0 ? rows : null);
    };
    reader.readAsText(file, "utf-8");
  };

  // Order â†’ Sales Invoice conversion (web orders)
  const [convertOrder, setConvertOrder] = useState<any>(null);
  const [convertForm, setConvertForm] = useState({
    paymentMethod: "cash",
    paidAmount: "0",
  });
  const convertToInvoice = trpc.orders.createSaleInvoice.useMutation({
    onSuccess: r => {
      toast.success(
        `ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª ${r.invoiceNumber}`
      );
      setConvertOrder(null);
      refetchSales();
      refetchOrders();
    },
    onError: e =>
      toast.error(
        String(e.message || "ÙØ´Ù„ ØªØ­ÙˆÙŠÙ„ Ø§Ù„Ø·Ù„Ø¨ Ø¥Ù„Ù‰ ÙØ§ØªÙˆØ±Ø©")
      ),
  });

  // Customers
  const {
    data: customersResponse,
    refetch: refetchCustomers,
    isLoading: loadingCustomers,
  } = trpc.customers.list.useQuery(
    {
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const customersData = customersResponse?.items ?? [];
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    code: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
  });
  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ù…ÙŠÙ„");
      refetchCustomers();
      setShowCustomerDialog(false);
      setCustomerForm({
        code: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
      });
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const isCreatingCustomer = createCustomer.isPending;

  // Customer detail dialog (carries custom fields)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerDetailOpen, setCustomerDetailOpen] = useState(false);
  const openCustomerDetail = (c: any) => {
    setSelectedCustomer(c);
    setCustomerDetailOpen(true);
  };

  // Suppliers
  const {
    data: suppliersResponse,
    refetch: refetchSuppliers,
    isLoading: loadingSuppliers,
  } = trpc.suppliers.list.useQuery(
    {
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const suppliersData = suppliersResponse?.items ?? [];
  const [showSupplierDialog, setShowSupplierDialog] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    code: "",
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
  });
  const createSupplier = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ù…ÙˆØ±Ø¯");
      refetchSuppliers();
      setShowSupplierDialog(false);
      setSupplierForm({
        code: "",
        name: "",
        phone: "",
        email: "",
        address: "",
        city: "",
      });
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const isCreatingSupplier = createSupplier.isPending;

  // Supplier detail dialog (carries custom fields)
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [supplierDetailOpen, setSupplierDetailOpen] = useState(false);
  const openSupplierDetail = (s: any) => {
    setSelectedSupplier(s);
    setSupplierDetailOpen(true);
  };

  // Sales
  const {
    data: salesResponse,
    refetch: refetchSales,
    isLoading: loadingSales,
  } = trpc.sales.list.useQuery(
    {
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const salesData = salesResponse?.items ?? [];
  const [showSaleDialog, setShowSaleDialog] = useState(false);
  const [saleItems, setSaleItems] = useState<
    {
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: string;
      discount: string;
      productType?: "goods" | "service";
    }[]
  >([]);
  const [saleCustomerId, setSaleCustomerId] = useState<number | undefined>();
  const [salePayment, setSalePayment] = useState<
    "cash" | "card" | "transfer" | "credit"
  >("cash");
  const createSale = trpc.sales.create.useMutation({
    onSuccess: (data: any) => {
      toast.success("ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª");
      refetchSales();
      refetchProducts();
      setSaleItems([]);
      setSaleCoords({});
      setSaleWorkSiteId(undefined);
      setSaleDeviceId(undefined);
      if (data?.zatcaView) {
        setZatcaView(data.zatcaView);
        setShowSaleDialog(false);
      } else {
        setShowSaleDialog(false);
      }
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const isCreatingSale = createSale.isPending;

  // â”€â”€â”€ Ù…Ø±Ø§Ø¬Ø¹Ø© ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª Ù‚Ø¨Ù„ Ø§Ù„Ø­ÙØ¸ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showSaleReview, setShowSaleReview] = useState(false);
  const [reviewSaleLines, setReviewSaleLines] = useState<InvoicePreviewLine[]>(
    []
  );
  const [reviewSaleHeader, setReviewSaleHeader] = useState({
    customerId: undefined as number | undefined,
    paymentMethod: "cash" as "cash" | "card" | "transfer" | "credit",
    paidAmount: "0",
    discount: "0",
    taxRate: "0",
    currency: "YER",
    currencyRate: "1",
  });
  const openSaleReview = () => {
    if (saleItems.length === 0)
      return toast.error("Ø£Ø¶Ù ØµÙ†ÙØ§Ù‹ ÙˆØ§Ø­Ø¯Ø§Ù‹ Ø¹Ù„Ù‰ Ø§Ù„Ø£Ù‚Ù„");
    const subtotal = saleItems.reduce(
      (sum, item) => sum + parseFloat(item.unitPrice || "0") * item.quantity,
      0
    );
    setReviewSaleLines(
      saleItems.map((item, idx) => ({
        id: String(idx),
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount ?? "0",
        taxPct: Number(settingsQ.data?.postingRules?.vatRate ?? 0) || 0,
      }))
    );
    setReviewSaleHeader({
      customerId: saleCustomerId,
      paymentMethod: salePayment,
      paidAmount: salePayment === "cash" ? subtotal.toString() : "0",
      discount: "0",
      taxRate: String(Number(settingsQ.data?.postingRules?.vatRate ?? 0) || 0),
      currency: saleCurrency,
      currencyRate: saleCurrencyRate,
    });
    setShowSaleReview(true);
  };
  const submitReviewedSale = (confirmedLines: InvoicePreviewLine[]) => {
    createSale.mutate({
      customerId: reviewSaleHeader.customerId,
      items: confirmedLines.map(l => ({
        productId: l.productId,
        productName: l.productName ?? "",
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discount: l.discount ?? "0",
      })),
      paymentMethod: reviewSaleHeader.paymentMethod,
      paidAmount: reviewSaleHeader.paidAmount,
      discount: reviewSaleHeader.discount,
      country: (settingsQ.data as any)?.country,
      workSiteId: saleWorkSiteId,
      deviceId: saleDeviceId,
      lat: saleCoords.lat,
      lng: saleCoords.lng,
      currency: reviewSaleHeader.currency,
      currencyRate: reviewSaleHeader.currencyRate,
    });
    setShowSaleReview(false);
  };

  // â”€â”€â”€ Multi-currency + offers (Module B) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const currenciesQ = trpc.modules.currencies.list.useQuery();
  const [saleCurrency, setSaleCurrency] = useState("YER");
  const [saleCurrencyRate, setSaleCurrencyRate] = useState("1");
  const [saleSource, setSaleSource] = useState("");
  const [importingSaleFile, setImportingSaleFile] = useState(false);
  const saleImportInputRef = useRef<HTMLInputElement>(null);
  const recentSalesForInvoiceQ = trpc.sales.list.useQuery(
    { limit: 20, offset: 0 },
    { enabled: showSaleDialog, staleTime: 30_000 }
  );
  const recentOrdersForInvoiceQ = trpc.orders.list.useQuery(
    { limit: 20, offset: 0 },
    { enabled: showSaleDialog, staleTime: 30_000 }
  );
  const saleSourceKind = saleSource.startsWith("invoice:")
    ? "invoice"
    : "order";
  const saleSourceId = Number(saleSource.split(":")[1]) || 0;
  const saleSourceInvoiceQ = trpc.sales.getInvoiceDetails.useQuery(
    { id: saleSourceKind === "invoice" ? saleSourceId : 0 },
    { enabled: saleSourceKind === "invoice" && saleSourceId > 0 }
  );
  const saleSourceOrderItemsQ = trpc.orders.getItems.useQuery(
    { orderId: saleSourceKind === "order" ? saleSourceId : 0 },
    { enabled: saleSourceKind === "order" && saleSourceId > 0 }
  );
  const resolveInvoiceImport = trpc.products.resolveInvoiceImport.useMutation();
  const extractInvoiceImage = trpc.documents.extractInvoiceImage.useMutation();
  const [extractingInvoiceImage, setExtractingInvoiceImage] = useState(false);
  const invoiceImageInputRef = useRef<HTMLInputElement>(null);
  const [invoiceImageTarget, setInvoiceImageTarget] = useState<
    "sale" | "purchase"
  >("sale");
  const importInvoiceImage = async (
    file?: File,
    kind: "sale" | "purchase" = "sale"
  ) => {
    if (!file) return;
    setExtractingInvoiceImage(true);
    try {
      const image = await prepareInvoiceImage(file);
      const extracted = await extractInvoiceImage.mutateAsync(image);
      if (!extracted.items.length)
        throw new Error(
          "Ù„Ù… ÙŠØ¹Ø«Ø± Ø§Ù„Ù†Ù…ÙˆØ°Ø¬ Ø¹Ù„Ù‰ Ø¨Ù†ÙˆØ¯ ÙˆØ§Ø¶Ø­Ø© ÙÙŠ Ø§Ù„ØµÙˆØ±Ø©"
        );
      if (
        extracted.items.some(
          (item: { quantity: number | null; unitPrice: number | null }) =>
            !item.quantity || item.unitPrice === null
        )
      )
        throw new Error(
          "Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø¨Ø¹Ø¶ Ø§Ù„ÙƒÙ…ÙŠØ§Øª Ø£Ùˆ Ø§Ù„Ø£Ø³Ø¹Ø§Ø± ØºÙŠØ± Ù…ÙƒØªÙ…Ù„Ø› Ø±Ø§Ø¬Ø¹ ÙˆØ¶ÙˆØ­ Ø§Ù„ØµÙˆØ±Ø© Ø«Ù… Ø£Ø¹Ø¯ Ø§Ù„Ù…Ø­Ø§ÙˆÙ„Ø©"
        );
      const resolved = await resolveInvoiceImport.mutateAsync({
        lines: extracted.items.map(
          (item: {
            code: string;
            name: string;
            quantity: number | null;
            unitPrice: number | null;
          }) => ({
            code: item.code || undefined,
            name: item.name,
            quantity: item.quantity!,
            unitPrice: String(item.unitPrice),
            discount: "0",
          })
        ),
      });
      if (resolved.some(line => !line.product))
        throw new Error(
          "ØªÙ… Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø§Ù„Ø¨Ù†ÙˆØ¯ Ù„ÙƒÙ† Ø¨Ø¹Ø¶Ù‡Ø§ ØºÙŠØ± Ù…Ø³Ø¬Ù„ ÙƒØµÙ†Ù Ø£Ùˆ Ø®Ø¯Ù…Ø©Ø› Ø£Ø¶ÙÙ‡Ø§ Ù…Ù† Ø§Ù„Ø¯Ù„ÙŠÙ„ Ø£Ùˆ Ø¹Ø¯Ù‘Ù„ Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø«Ù… Ø£Ø¹Ø¯ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯"
        );
      const mapped = resolved.map(line => {
        if (!line.product)
          throw new Error("Ù„Ù… ØªØªÙ… Ù…Ø·Ø§Ø¨Ù‚Ø© Ø£Ø­Ø¯ Ø§Ù„Ø¨Ù†ÙˆØ¯");
        return {
          productId: line.product.id,
          productName: line.product.name,
          productType: line.product.type as "goods" | "service",
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
        };
      });
      if (kind === "sale") setSaleItems(mapped as any);
      else {
        setPurchaseItems(mapped);
        setPurchasePoId(undefined);
        setPurchaseSource("");
      }
      toast.success(
        `ØªÙ… Ø§Ø³ØªØ®Ø±Ø§Ø¬ ${mapped.length} Ø¨Ù†Ø¯Ø§Ù‹. Ø±Ø§Ø¬Ø¹Ù‡Ø§ Ù‚Ø¨Ù„ Ø­ÙØ¸ Ø§Ù„ÙØ§ØªÙˆØ±Ø©.`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "ØªØ¹Ø°Ø± Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„ØµÙˆØ±Ø©"
      );
    } finally {
      setExtractingInvoiceImage(false);
    }
  };
  const loadSaleSource = () => {
    if (!saleSourceId) return;
    if (saleSourceKind === "invoice") {
      const result = saleSourceInvoiceQ.data;
      if (!result)
        return toast.error(
          "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©"
        );
      setSaleItems(
        result.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          discount: String(item.discount ?? "0"),
        }))
      );
      setSaleCustomerId(result.invoice.customerId ?? undefined);
      setSaleCurrency(result.invoice.currency || "YER");
      setSaleCurrencyRate(String(result.invoice.currencyRate || "1"));
    } else {
      const result = saleSourceOrderItemsQ.data;
      if (!result?.length)
        return toast.error(
          "Ø§Ù„Ø·Ù„Ø¨ Ù„Ø§ ÙŠØ­ØªÙˆÙŠ ØªÙØ§ØµÙŠÙ„ Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ØªØ­Ù…ÙŠÙ„"
        );
      setSaleItems(
        result.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          discount: "0",
        }))
      );
      const selectedOrder = ordersData.find(order => order.id === saleSourceId);
      if (selectedOrder?.customerId)
        setSaleCustomerId(selectedOrder.customerId);
    }
    toast.success(
      "ØªÙ… ØªØ­Ù…ÙŠÙ„ ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…ØµØ¯Ø± Ø¥Ù„Ù‰ Ù…Ø³ÙˆØ¯Ø© Ø§Ù„ÙØ§ØªÙˆØ±Ø©"
    );
  };
  const importSaleFile = async (file?: File) => {
    if (!file) return;
    setImportingSaleFile(true);
    try {
      const lines = await parseInvoiceImportFile(file);
      const resolved = await resolveInvoiceImport.mutateAsync({ lines });
      const mapped = resolved.flatMap(line =>
        line.product
          ? [
              {
                productId: line.product.id,
                productName: line.product.name,
                productType: line.product.type as "goods" | "service",
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                discount: line.discount,
              },
            ]
          : []
      );
      if (!mapped.length)
        throw new Error(
          "Ù„Ù… ØªØ·Ø§Ø¨Ù‚ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ù„Ù Ø£ÙŠ ØµÙ†Ù Ù…Ø³Ø¬Ù„Ø› Ø§Ø³ØªØ®Ø¯Ù… Ø§Ù„Ø±Ù…Ø² Ø£Ùˆ Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯ Ø£Ùˆ Ø§Ù„Ø§Ø³Ù… Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚."
        );
      if (mapped.length !== resolved.length)
        throw new Error(
          `ØªÙ…Øª Ù…Ø·Ø§Ø¨Ù‚Ø© ${mapped.length} Ù…Ù† ${resolved.length} Ø¨Ù†Ø¯Ø§Ù‹. Ù„Ù… ØªØªØºÙŠØ± Ø§Ù„ÙØ§ØªÙˆØ±Ø©Ø› ØµØ­Ø­ Ø±Ù…ÙˆØ² Ø£Ùˆ Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„Ø¨Ù†ÙˆØ¯ ØºÙŠØ± Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø«Ù… Ø£Ø¹Ø¯ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯.`
        );
      setSaleItems(mapped);
      const unmatched = resolved.length - mapped.length;
      toast.success(
        `ØªÙ… ØªØ­Ù…ÙŠÙ„ ${mapped.length} Ø¨Ù†Ø¯${unmatched ? `ØŒ ÙˆØªØ¬Ø§Ù‡Ù„ ${unmatched} ØºÙŠØ± Ù…Ø·Ø§Ø¨Ù‚` : ""}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "ØªØ¹Ø°Ø± Ø§Ø³ØªÙŠØ±Ø§Ø¯ ØªÙØ§ØµÙŠÙ„ Ø§Ù„ÙØ§ØªÙˆØ±Ø©"
      );
    } finally {
      setImportingSaleFile(false);
    }
  };
  const applyOffersToSale = () => {
    if (!offersData) return;
    const now = new Date();
    const next = saleItems.map(it => {
      const prod: any = (productsData as any[]).find(
        p => p.id === it.productId
      );
      const catId = prod?.categoryId;
      const candidates = (offersData as any[]).filter(
        o =>
          o.isActive &&
          (!o.startDate || new Date(o.startDate) <= now) &&
          (!o.endDate || new Date(o.endDate) >= now) &&
          (o.minQty == null || it.quantity >= Number(o.minQty)) &&
          (o.productId == null || o.productId === it.productId) &&
          (o.categoryId == null || o.categoryId === catId)
      );
      if (candidates.length === 0) return it;
      candidates.sort(
        (a, b) => Number(b.discountPercent) - Number(a.discountPercent)
      );
      const best = candidates[0];
      const lineSub = parseFloat(it.unitPrice) * it.quantity;
      const disc = (lineSub * (Number(best.discountPercent) || 0)) / 100;
      return { ...it, discount: disc.toFixed(2) };
    });
    setSaleItems(next);
    toast.success(
      "ØªÙ… ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ù…ØªØ§Ø­Ø© Ø¹Ù„Ù‰ Ø§Ù„Ø£ØµÙ†Ø§Ù"
    );
  };

  // â”€â”€â”€ Governance / audit / traceability (work site, device, coords) â”€â”€â”€
  const settingsQ = trpc.accounting.getSettings.useQuery();
  const workSitesQ = trpc.workSites.list.useQuery();
  const devicesQ = trpc.devices.list.useQuery();
  const [saleWorkSiteId, setSaleWorkSiteId] = useState<number | undefined>();
  const [saleDeviceId, setSaleDeviceId] = useState<number | undefined>();
  const [saleCoords, setSaleCoords] = useState<{ lat?: string; lng?: string }>(
    {}
  );
  const [zatcaView, setZatcaView] = useState<any>(null);
  const pickLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Ø§Ù„Ù…ØªØµÙØ­ Ù„Ø§ ÙŠØ¯Ø¹Ù… ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆÙ‚Ø¹");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos =>
        setSaleCoords({
          lat: pos.coords.latitude.toString(),
          lng: pos.coords.longitude.toString(),
        }),
      () => toast.error("ØªØ¹Ø°Ø± ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆÙ‚Ø¹")
    );
  };

  // Purchases
  const {
    data: purchasesResponse,
    refetch: refetchPurchases,
    isLoading: loadingPurchases,
  } = trpc.purchases.list.useQuery(
    {
      search: debouncedSearch || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );
  const purchasesData = purchasesResponse?.items ?? [];
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const [purchaseItems, setPurchaseItems] = useState<
    {
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: string;
      discount: string;
    }[]
  >([]);
  const [purchaseSupplierId, setPurchaseSupplierId] = useState<
    number | undefined
  >();
  const [purchaseCurrency, setPurchaseCurrency] = useState("YER");
  const [purchaseExchangeRate, setPurchaseExchangeRate] = useState("1");
  const [purchasePoId, setPurchasePoId] = useState<number | undefined>();
  const [purchaseSource, setPurchaseSource] = useState("");
  const recentPurchasesForInvoiceQ = trpc.purchases.list.useQuery(
    { limit: 20, offset: 0 },
    { enabled: showPurchaseDialog, staleTime: 30_000 }
  );
  const recentPurchaseOrdersQ = trpc.purchaseOrders.list.useQuery(
    { limit: 30, offset: 0 },
    { enabled: showPurchaseDialog, staleTime: 30_000 }
  );
  const purchaseSourceKind = purchaseSource.startsWith("invoice:")
    ? "invoice"
    : "po";
  const purchaseSourceId = Number(purchaseSource.split(":")[1]) || 0;
  const purchaseSourceInvoiceItemsQ = trpc.purchases.getItems.useQuery(
    { invoiceId: purchaseSourceKind === "invoice" ? purchaseSourceId : 0 },
    {
      enabled:
        showPurchaseDialog &&
        purchaseSourceKind === "invoice" &&
        purchaseSourceId > 0,
    }
  );
  const purchaseSourceOrderQ = trpc.purchaseOrders.view.useQuery(
    { id: purchaseSourceId },
    { enabled: showPurchaseDialog && purchaseSourceId > 0 }
  );
  const purchaseImportInputRef = useRef<HTMLInputElement>(null);
  const [importingPurchaseFile, setImportingPurchaseFile] = useState(false);
  const importPurchaseFile = async (file?: File) => {
    if (!file) return;
    setImportingPurchaseFile(true);
    try {
      const lines = await parseInvoiceImportFile(file);
      const resolved = await resolveInvoiceImport.mutateAsync({ lines });
      const mapped = resolved.flatMap(line =>
        line.product
          ? [
              {
                productId: line.product.id,
                productName: line.product.name,
                quantity: line.quantity,
                unitPrice: line.unitPrice,
                discount: line.discount,
              },
            ]
          : []
      );
      if (!mapped.length)
        throw new Error(
          "Ù„Ù… ØªØ·Ø§Ø¨Ù‚ Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ù…Ù„Ù Ø£ÙŠ ØµÙ†Ù Ø£Ùˆ Ø®Ø¯Ù…Ø© Ù…Ø³Ø¬Ù„Ø©."
        );
      if (mapped.length !== resolved.length)
        throw new Error(
          `ØªÙ…Øª Ù…Ø·Ø§Ø¨Ù‚Ø© ${mapped.length} Ù…Ù† ${resolved.length} Ø¨Ù†Ø¯Ø§Ù‹. Ù„Ù… ØªØªØºÙŠØ± Ø§Ù„ÙØ§ØªÙˆØ±Ø©Ø› ØµØ­Ø­ Ø±Ù…ÙˆØ² Ø£Ùˆ Ø£Ø³Ù…Ø§Ø¡ Ø§Ù„Ø¨Ù†ÙˆØ¯ ØºÙŠØ± Ø§Ù„Ù…Ø·Ø§Ø¨Ù‚Ø© Ø«Ù… Ø£Ø¹Ø¯ Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯.`
        );
      setPurchaseItems(mapped);
      setPurchasePoId(undefined);
      setPurchaseSource("");
      const unmatched = resolved.length - mapped.length;
      toast.success(
        `ØªÙ… ØªØ­Ù…ÙŠÙ„ ${mapped.length} Ø¨Ù†Ø¯${unmatched ? `ØŒ ÙˆØªØ¬Ø§Ù‡Ù„ ${unmatched} ØºÙŠØ± Ù…Ø·Ø§Ø¨Ù‚` : ""}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "ØªØ¹Ø°Ø± Ø§Ø³ØªÙŠØ±Ø§Ø¯ ØªÙØ§ØµÙŠÙ„ Ø§Ù„ÙØ§ØªÙˆØ±Ø©"
      );
    } finally {
      setImportingPurchaseFile(false);
    }
  };
  const loadPurchaseOrder = () => {
    if (purchaseSourceKind === "invoice") {
      const priorInvoice = (recentPurchasesForInvoiceQ.data?.items ?? []).find(
        item => item.id === purchaseSourceId
      );
      const lines = purchaseSourceInvoiceItemsQ.data;
      if (!priorInvoice || !lines?.length)
        return toast.error(
          "ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ ØªÙØ§ØµÙŠÙ„ ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø´Ø±Ø§Ø¡ Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©"
        );
      setPurchaseItems(
        lines.map(line => ({
          productId: line.productId,
          productName: line.productName,
          quantity: line.quantity,
          unitPrice: String(line.unitPrice),
          discount: String(line.discount || "0"),
        }))
      );
      setPurchaseSupplierId(priorInvoice.supplierId ?? undefined);
      setPurchasePoId(undefined);
      setPurchaseCurrency(
        priorInvoice.currency ||
          (currenciesQ.data || []).find(
            (item: any) => item.id === priorInvoice.currencyId
          )?.code ||
          "YER"
      );
      setPurchaseExchangeRate(String(priorInvoice.exchangeRate || "1"));
      toast.success(
        "ØªÙ… ØªØ­Ù…ÙŠÙ„ ØªÙØ§ØµÙŠÙ„ Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø³Ø§Ø¨Ù‚Ø©"
      );
      return;
    }
    const source = purchaseSourceOrderQ.data;
    if (!source) return toast.error("ØªØ¹Ø°Ø± ØªØ­Ù…ÙŠÙ„ Ø£Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡");
    const lines = source.lines.filter(line => line.quantity > 0);
    if (!lines.length)
      return toast.error(
        "Ø£Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡ Ù„Ø§ ÙŠØ­ØªÙˆÙŠ Ø¨Ù†ÙˆØ¯Ø§Ù‹ Ù‚Ø§Ø¨Ù„Ø© Ù„Ù„ÙÙˆØªØ±Ø©"
      );
    setPurchaseItems(
      lines.map(line => ({
        productId: line.productId,
        productName: line.productName,
        quantity: line.quantity,
        unitPrice: String(line.unitPrice),
        discount: String(line.discount || "0"),
      }))
    );
    setPurchaseSupplierId(source.po.supplierId);
    setPurchasePoId(source.po.id);
    const currency = (currenciesQ.data || []).find(
      (item: any) => item.id === source.po.currencyId
    );
    setPurchaseCurrency(currency?.code || "YER");
    setPurchaseExchangeRate(
      String(source.po.exchangeRate || currency?.rate || "1")
    );
    toast.success(
      "ØªÙ… ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨Ù†ÙˆØ¯ ÙˆØ§Ù„Ù…ÙˆØ±Ø¯ ÙˆØ§Ù„Ø¹Ù…Ù„Ø© Ù…Ù† Ø£Ù…Ø± Ø§Ù„Ø´Ø±Ø§Ø¡"
    );
  };
  const createPurchase = trpc.purchases.create.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª");
      refetchPurchases();
      refetchProducts();
      setShowPurchaseDialog(false);
      setPurchaseItems([]);
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const isCreatingPurchase = createPurchase.isPending;

  // Orders
  const {
    data: ordersResponse,
    refetch: refetchOrders,
    isLoading: loadingOrders,
  } = trpc.orders.list.useQuery({
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });
  const ordersData = ordersResponse?.items ?? [];
  const pendingWebOrders = ordersData.filter(
    o => isWebOrder(o) && o.status === "pending"
  ).length;
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderItems, setOrderItems] = useState<
    {
      productId: number;
      productName: string;
      quantity: number;
      unitPrice: string;
      discount: string;
    }[]
  >([]);
  const [orderCustomerId, setOrderCustomerId] = useState<number | undefined>();
  const [orderAddress, setOrderAddress] = useState("");
  const createOrder = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨");
      refetchOrders();
      setShowOrderDialog(false);
      setOrderItems([]);
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const isCreatingOrder = createOrder.isPending;

  // â”€â”€â”€ Offers / Discounts (Module B) â”€â”€â”€
  const { data: offersData, isPending: loadingOffers } =
    trpc.modules.offers.list.useQuery(undefined, { staleTime: 60_000 });
  const productsForOffer = trpc.products.list.useQuery(
    { limit: 100 },
    { staleTime: 60_000 }
  );
  const catsForOffer = trpc.modules.masterData.listCategories.useQuery(
    undefined,
    {
      staleTime: 60_000,
    }
  );
  const createOffer = trpc.modules.offers.create.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ…Øª Ø¥Ø¶Ø§ÙØ© Ø§Ù„Ø¹Ø±Ø¶");
      setShowOfferDialog(false);
      setOfferForm({
        name: "",
        kind: "financial",
        discountPercent: "0",
        minQty: "",
        productId: undefined,
        categoryId: undefined,
        startDate: "",
        endDate: "",
        isActive: true,
      });
      utils.modules.offers.list.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });
  const updateOffer = trpc.modules.offers.update.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ«");
      setEditOffer(null);
      utils.modules.offers.list.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });
  const deleteOffer = trpc.modules.offers.delete.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… Ø§Ù„Ø­Ø°Ù");
      utils.modules.offers.list.invalidate();
    },
    onError: (e: any) => toast.error(friendlyError(e)),
  });
  const [showOfferDialog, setShowOfferDialog] = useState(false);
  const [offerForm, setOfferForm] = useState<any>({
    name: "",
    kind: "financial",
    discountPercent: "0",
    minQty: "",
    productId: undefined as number | undefined,
    categoryId: undefined as number | undefined,
    startDate: "",
    endDate: "",
    isActive: true,
  });
  const [editOffer, setEditOffer] = useState<any>(null);

  // â”€â”€â”€ Product Picker (shared by Sale / Purchase / Order dialogs) â”€â”€â”€
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<
    "sale" | "purchase" | "order" | null
  >(null);

  const openPicker = (mode: "sale" | "purchase" | "order") => {
    setPickerMode(mode);
    setPickerOpen(true);
  };

  const handlePick = (p: any) => {
    if (!p) return;
    if (pickerMode === "sale") {
      setSaleItems([
        ...saleItems,
        {
          productId: p.id,
          productName: p.name,
          productType: p.type,
          quantity: 1,
          unitPrice: String(p.salePrice ?? "0"),
          discount: "0",
        },
      ]);
    } else if (pickerMode === "purchase") {
      setPurchaseItems([
        ...purchaseItems,
        {
          productId: p.id,
          productName: p.name,
          quantity: 1,
          unitPrice: String(p.purchasePrice ?? "0"),
          discount: "0",
        },
      ]);
    } else if (pickerMode === "order") {
      setOrderItems([
        ...orderItems,
        {
          productId: p.id,
          productName: p.name,
          quantity: 1,
          unitPrice: String(p.salePrice ?? "0"),
          discount: "0",
        },
      ]);
    }
  };
  const updateOrderStatus = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„Ø·Ù„Ø¨");
      refetchOrders();
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const updateSaleStatus = trpc.sales.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„ÙØ§ØªÙˆØ±Ø©");
      refetchSales();
      refetchProducts();
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const updatePurchaseStatus = trpc.purchases.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… ØªØ­Ø¯ÙŠØ« Ø­Ø§Ù„Ø© Ø§Ù„ÙØ§ØªÙˆØ±Ø©");
      refetchPurchases();
      refetchProducts();
    },
    onError: e => toast.error(friendlyError(e)),
  });

  const utils = trpc.useUtils();

  // Payments (installments & settlements)
  const printAfterSaveRef = useRef(false);
  const pendingReceiptRef = useRef<{
    invoice: any;
    amount: string;
    method: string;
    date: string;
    source: "sales" | "purchases";
  } | null>(null);
  const [printAfterSave, setPrintAfterSave] = useState(true);
  const createPayment = trpc.payments.create.useMutation({
    onSuccess: () => {
      toast.success("ØªÙ… ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯ÙØ¹Ø© Ø¨Ù†Ø¬Ø§Ø­");
      setPayTarget(null);
      setPayAmount("");
      refetchSales();
      refetchPurchases();
      refetchCustomers();
      refetchSuppliers();
      if (printAfterSaveRef.current && pendingReceiptRef.current) {
        const r = pendingReceiptRef.current;
        pendingReceiptRef.current = null;
        printAfterSaveRef.current = false;
        printPaymentReceipt({
          ...r,
          utils,
        });
      }
    },
    onError: e => toast.error(friendlyError(e)),
  });
  const [payTarget, setPayTarget] = useState<{
    invoice: any;
    source: "sales" | "purchases";
  } | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState<
    "cash" | "card" | "transfer" | "credit" | "online"
  >("cash");
  const [payDate, setPayDate] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const openPayDialog = (invoice: any, source: "sales" | "purchases") => {
    const remaining =
      Number(invoice.total ?? 0) - Number(invoice.paidAmount ?? 0);
    if (remaining <= 0.01) {
      toast.info("Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ù…Ø³Ø¯Ø¯Ø© Ø¨Ø§Ù„ÙƒØ§Ù…Ù„");
      return;
    }
    setPayTarget({ invoice, source });
    setPayAmount("");
    setPayMethod(
      invoice.paymentMethod === "credit"
        ? "cash"
        : invoice.paymentMethod || "cash"
    );
    setPayDate("");
    setPayNotes("");
  };

  const handlePay = useCallback(() => {
    if (!payTarget) return;
    const amt = parseFloat(payAmount);
    const remaining =
      Number(payTarget.invoice.total) -
      Number(payTarget.invoice.paidAmount ?? 0);
    if (!payAmount || isNaN(amt) || amt <= 0) {
      toast.error("Ø£Ø¯Ø®Ù„ Ù…Ø¨Ù„ØºØ§Ù‹ Ù…ÙˆØ¬Ø¨Ø§Ù‹");
      return;
    }
    if (amt > remaining + 0.01) {
      toast.error(
        `Ø§Ù„Ù…Ø¨Ù„Øº ÙŠØªØ¬Ø§ÙˆØ² Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ (${remaining.toLocaleString("en-US")})`
      );
      return;
    }
    printAfterSaveRef.current = printAfterSave;
    pendingReceiptRef.current = printAfterSave
      ? {
          invoice: payTarget.invoice,
          amount: payAmount,
          method: payMethod,
          date: payDate,
          source: payTarget.source,
        }
      : null;
    createPayment.mutate({
      source: payTarget.source,
      invoiceId: payTarget.invoice.id,
      amount: payAmount,
      paymentMethod: payMethod,
      paymentDate: payDate || undefined,
      notes: payNotes.trim() || undefined,
    });
  }, [
    payTarget,
    payAmount,
    payMethod,
    payDate,
    payNotes,
    printAfterSave,
    createPayment,
  ]);

  const handlePrintSaleInvoice = (invId: number) => {
    printSaleInvoice(invId, utils);
  };

  const saleTotal = useMemo(
    () =>
      saleItems.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
        0
      ),
    [saleItems]
  );
  const saleDiscountTotal = useMemo(
    () =>
      saleItems.reduce(
        (sum, item) => sum + (parseFloat(item.discount) || 0),
        0
      ),
    [saleItems]
  );
  const saleGrandTotal = saleTotal - saleDiscountTotal;
  const purchaseTotal = useMemo(
    () =>
      purchaseItems.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
        0
      ),
    [purchaseItems]
  );
  const orderTotal = useMemo(
    () =>
      orderItems.reduce(
        (sum, item) => sum + parseFloat(item.unitPrice) * item.quantity,
        0
      ),
    [orderItems]
  );

  // NOTE: item selection now goes through the shared <ProductPicker/> via
  // openPicker(...) â€” the old "add first product" shortcut is intentionally
  // removed so the cashier always picks the exact item they are selling.
  const addItemToSale = () => openPicker("sale");
  const addItemToPurchase = () => openPicker("purchase");
  const addItemToOrder = () => openPicker("order");

  const statusColorsMap = statusColors;
  const statusLabelsMap = statusLabels;

  return (
    <div className="min-h-screen bg-sand" dir="rtl">
      <main className="max-w-7xl mx-auto p-3">
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={
                activeTab === "sales"
                  ? "Ø¨Ø­Ø« Ø¨Ø±Ù‚Ù… ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª..."
                  : activeTab === "purchases"
                    ? "Ø¨Ø­Ø« Ø¨Ø±Ù‚Ù… ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª..."
                    : activeTab === "orders"
                      ? "Ø¨Ø­Ø« Ø¨Ø±Ù‚Ù… Ø§Ù„Ø·Ù„Ø¨..."
                      : "Ø¨Ø­Ø« Ø¨Ø§Ù„Ø§Ø³Ù… Ø£Ùˆ Ø§Ù„Ø±Ù…Ø² Ø£Ùˆ Ø§Ù„Ù‡Ø§ØªÙ..."
              }
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="bg-card border-border pr-10 h-9 text-sm"
            />
          </div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={v => {
            setActiveTab(v as Tab);
            setPage(0);
            setSearchQuery("");
          }}
        >
          <TabsList className="tabs-primary w-full sm:w-auto">
            <TabsTrigger value="products" className="tab-trigger">
              <Package className="w-3 h-3 ml-1" />
              Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª
            </TabsTrigger>
            <TabsTrigger value="customers" className="tab-trigger">
              <Users className="w-3.5 h-3.5 ml-1.5" />
              Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="tab-trigger">
              <Truck className="w-3.5 h-3.5 ml-1.5" />
              Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†
            </TabsTrigger>
            <TabsTrigger value="sales" className="tab-trigger">
              <ShoppingCart className="w-3.5 h-3.5 ml-1.5" />
              Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª
            </TabsTrigger>
            <TabsTrigger value="purchases" className="tab-trigger">
              <ShoppingBag className="w-3.5 h-3.5 ml-1.5" />
              Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª
            </TabsTrigger>
            <TabsTrigger value="orders" className="tab-trigger">
              <ClipboardList className="w-3.5 h-3.5 ml-1.5" />
              Ø§Ù„Ø·Ù„Ø¨Ø§Øª
            </TabsTrigger>
            <TabsTrigger value="offers" className="tab-trigger">
              <Tag className="w-3.5 h-3.5 ml-1.5" />
              Ø§Ù„Ø¹Ø±ÙˆØ¶
            </TabsTrigger>
          </TabsList>

          {/* â”€â”€â”€ Products Tab â”€â”€â”€ */}
          <TabsContent value="products">
            <Card className="panel-premium shadow-modern-soft">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-ink">
                  Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª ÙˆØ§Ù„Ù…Ø®Ø§Ø²Ù†
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 border-border"
                    onClick={() => exportProductsCsv(productsData)}
                    title="ØªØµØ¯ÙŠØ± Ø§Ù„Ø£ØµÙ†Ø§Ù Ø§Ù„Ø­Ø§Ù„ÙŠØ© Ø¥Ù„Ù‰ CSV"
                  >
                    <Download className="w-3 h-3 ml-1" />
                    ØªØµØ¯ÙŠØ± CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 border-border"
                    onClick={() => setShowImportDialog(true)}
                    title="Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø£ØµÙ†Ø§Ù/Ø®Ø¯Ù…Ø§Øª Ù…Ù† Ù…Ù„Ù CSV"
                  >
                    <Upload className="w-3 h-3 ml-1" />
                    Ø§Ø³ØªÙŠØ±Ø§Ø¯ CSV
                  </Button>
                  <Button
                    size="sm"
                    className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-8"
                    onClick={() => setShowProductDialog(true)}
                  >
                    <Plus className="w-3 h-3 ml-1" />
                    Ù…Ù†ØªØ¬ Ø¬Ø¯ÙŠØ¯
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingProducts && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-muted rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingProducts &&
                    productsData.map(p => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-ink text-brand w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs">
                            {p.code}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-ink">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {p.category || "Ø¨Ø¯ÙˆÙ† ÙØ¦Ø©"} â€¢ {p.unit}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">
                              Ø§Ù„Ù…Ø®Ø²ÙˆÙ†
                            </p>
                            <p
                              className={`font-bold ${p.currentStock <= p.minStock ? "text-red-600" : "text-green-600"}`}
                            >
                              {p.currentStock}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">
                              Ø³Ø¹Ø± Ø§Ù„Ø´Ø±Ø§Ø¡
                            </p>
                            <p className="font-bold text-ink">
                              {p.purchasePrice}
                            </p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground">
                              Ø³Ø¹Ø± Ø§Ù„Ø¨ÙŠØ¹
                            </p>
                            <p className="font-bold text-green-600">
                              {p.salePrice}
                            </p>
                          </div>
                          {p.barcode && (
                            <Barcode className="w-4 h-4 text-muted-foreground" />
                          )}
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-6 h-6 text-[10px]"
                              title="ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ù†ØªØ¬"
                              onClick={() => {
                                setEditProductForm({
                                  id: p.id,
                                  name: p.name,
                                  salePrice: p.salePrice,
                                  purchasePrice: p.purchasePrice,
                                  minStock: p.minStock,
                                  barcode: p.barcode || "",
                                  productType: (p as any).type || "goods",
                                  unitOfMeasure: (p as any).unitOfMeasure || "",
                                  secondaryUnit: (p as any).secondaryUnit || "",
                                  conversionFactor: String(
                                    (p as any).conversionFactor ?? "1"
                                  ),
                                  isComposite: !!(p as any).isComposite,
                                  bom: (p as any).bom || "[]",
                                  alternativeIds:
                                    (p as any).alternativeIds || "[]",
                                  attachmentUrl: (p as any).attachmentUrl || "",
                                  costMethod: (p as any).costMethod || "fixed",
                                  directCost: String(
                                    (p as any).directCost ?? "0"
                                  ),
                                  indirectCost: String(
                                    (p as any).indirectCost ?? "0"
                                  ),
                                  productionMinutes: String(
                                    (p as any).productionMinutes ?? "0"
                                  ),
                                  priceMode: (p as any).priceMode || "margin",
                                  marginPct: String(
                                    (p as any).marginPct ?? "20"
                                  ),
                                  salesAccountId:
                                    (p as any).salesAccountId ?? undefined,
                                  cogsAccountId:
                                    (p as any).cogsAccountId ?? undefined,
                                  inventoryAccountId:
                                    (p as any).inventoryAccountId ?? undefined,
                                });
                                setEditProduct(p);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              className="w-6 h-6 text-[10px]"
                              title="ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†"
                              onClick={() => {
                                setAdjustForm({
                                  quantity: 1,
                                  type: "in",
                                  notes: "",
                                });
                                setAdjustProduct(p);
                              }}
                            >
                              <PackagePlus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  {productsData.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù†ØªØ¬Ø§Øª
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* â”€â”€â”€ Customers Tab â”€â”€â”€ */}
          <TabsContent value="customers">
            <Card className="panel-premium shadow-modern-soft">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-ink">
                  Ø§Ù„Ø¹Ù…Ù„Ø§Ø¡
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-8"
                  onClick={() => setShowCustomerDialog(true)}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingCustomers && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-muted rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingCustomers &&
                    customersData.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-brand text-white w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs">
                            {c.code}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-ink">
                              {c.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {c.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {c.phone}
                                </span>
                              )}
                              {c.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {c.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left flex flex-col items-end gap-1">
                          <p className="text-[10px] text-muted-foreground">
                            Ø§Ù„Ø±ØµÙŠØ¯
                          </p>
                          <p
                            className={`font-bold text-xs ${parseFloat(c.balance) > 0 ? "text-red-600" : "text-green-600"}`}
                          >
                            {c.balance}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6"
                            onClick={() => openCustomerDetail(c)}
                          >
                            ØªÙØ§ØµÙŠÙ„
                          </Button>
                        </div>
                      </div>
                    ))}
                  {customersData.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ø¹Ù…Ù„Ø§Ø¡
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* â”€â”€â”€ Suppliers Tab â”€â”€â”€ */}
          <TabsContent value="suppliers">
            <Card className="panel-premium shadow-modern-soft">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-ink">
                  Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-8"
                  onClick={() => setShowSupplierDialog(true)}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  Ù…ÙˆØ±Ø¯ Ø¬Ø¯ÙŠØ¯
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingSuppliers && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-muted rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingSuppliers &&
                    suppliersData.map(s => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-ink text-brand w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs">
                            {s.code}
                          </div>
                          <div>
                            <p className="font-bold text-xs text-ink">
                              {s.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                              {s.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {s.phone}
                                </span>
                              )}
                              {s.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {s.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-left flex flex-col items-end gap-1">
                          <p className="text-[10px] text-muted-foreground">
                            Ø§Ù„Ø±ØµÙŠØ¯
                          </p>
                          <p className="font-bold text-xs text-red-600">
                            {s.balance}
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6"
                            onClick={() => openSupplierDetail(s)}
                          >
                            ØªÙØ§ØµÙŠÙ„
                          </Button>
                        </div>
                      </div>
                    ))}
                  {suppliersData.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Ù„Ø§ ÙŠÙˆØ¬Ø¯ Ù…ÙˆØ±Ø¯ÙŠÙ†
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* â”€â”€â”€ Sales Tab â”€â”€â”€ */}
          <TabsContent value="sales">
            <Card className="panel-premium border-0">
              <CardHeader className="ribbon-premium flex flex-row items-center justify-between py-3 px-4">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-brand" />
                  ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø¨ÙŠØ¹Ø§Øª / Ù†Ù‚Ø·Ø© Ø§Ù„Ø¨ÙŠØ¹
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-8 press-effect shine-on-hover"
                  onClick={() => setShowSaleDialog(true)}
                >
                  <Plus className="w-3.5 h-3.5 ml-1" />
                  ÙØ§ØªÙˆØ±Ø© Ø¬Ø¯ÙŠØ¯Ø©
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {loadingSales && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-muted/50 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingSales &&
                    salesData?.map(inv => (
                      <div
                        key={inv.id}
                        className="datagrid flex items-center justify-between p-3.5 rounded-xl hover-lift transition-all"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-foreground font-mono">
                            {inv.invoiceNumber}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {inv.customerName || customerNameOf(inv.customerId)}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70 font-mono">
                            {new Date(inv.invoiceDate).toLocaleDateString(
                              "ar-EG"
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Badge
                            className={`text-[11px] font-bold ${statusColorsMap[inv.status] || ""}`}
                          >
                            {statusLabelsMap[inv.status] || inv.status}
                          </Badge>
                          <p className="font-bold text-sm text-success font-mono">
                            {inv.total} {inv.currency || "YER"}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 font-mono">
                            Ù…Ø¯ÙÙˆØ¹:{" "}
                            {Number(inv.paidAmount || 0).toLocaleString(
                              "en-US"
                            )}{" "}
                            Â· Ù…ØªØ¨Ù‚ÙŠ:{" "}
                            {(
                              Number(inv.total) - Number(inv.paidAmount || 0)
                            ).toLocaleString("en-US")}
                          </p>
                          {inv.status !== "cancelled" &&
                            Number(inv.total) - Number(inv.paidAmount || 0) >
                              0.01 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] h-7 text-success border-success/20 hover:bg-success/10/40 press-effect"
                                onClick={() => openPayDialog(inv, "sales")}
                              >
                                <Wallet className="w-3 h-3 ml-1" /> Ø¯ÙØ¹Ø©
                              </Button>
                            )}
                          {inv.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 text-info border-info/30 hover:bg-info/10 press-effect"
                              onClick={() => handlePrintSaleInvoice(inv.id)}
                            >
                              <Printer className="w-3 h-3 ml-1" /> Ø·Ø¨Ø§Ø¹Ø©
                            </Button>
                          )}
                          <EntityDocuments
                            entityType="salesInvoice"
                            entityId={inv.id}
                          />
                          {inv.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 text-destructive border-destructive/20 hover:bg-destructive/10/40 press-effect"
                              disabled={updateSaleStatus.isPending}
                              onClick={() => {
                                if (
                                  confirm(
                                    "Ø¥Ù„ØºØ§Ø¡ Ø§Ù„ÙØ§ØªÙˆØ±Ø©ØŸ Ø³ÙŠØªÙ… Ø¹ÙƒØ³ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ÙˆØ§Ù„Ø±ØµÙŠØ¯."
                                  )
                                )
                                  updateSaleStatus.mutate({
                                    id: inv.id,
                                    status: "cancelled",
                                  });
                              }}
                            >
                              Ø¥Ù„ØºØ§Ø¡
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  {(!salesData || salesData.length === 0) && (
                    <div className="empty-state rounded-2xl border border-border bg-surface p-8 text-center">
                      <div className="empty-state-icon mx-auto mb-3">
                        <ShoppingCart className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1">
                        Ù„Ø§ ØªÙˆØ¬Ø¯ ÙÙˆØ§ØªÙŠØ± Ù…Ø¨ÙŠØ¹Ø§Øª
                      </h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Ø§Ø¨Ø¯Ø£ Ø¨Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø© Ø¬Ø¯ÙŠØ¯Ø©
                        Ù„ØªØ³Ø¬ÙŠÙ„ Ø¹Ù…Ù„ÙŠØ© Ø¨ÙŠØ¹
                      </p>
                      <Button
                        size="sm"
                        className="bg-brand hover:bg-brand-deep text-ink-deep text-xs h-8 press-effect"
                        onClick={() => setShowSaleDialog(true)}
                      >
                        <Plus className="w-3.5 h-3.5 ml-1" />
                        Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø©
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* â”€â”€â”€ Purchases Tab â”€â”€â”€ */}
          <TabsContent value="purchases">
            <Card className="panel-premium border-0">
              <CardHeader className="ribbon-premium flex flex-row items-center justify-between py-3 px-4">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-brand" />
                  ÙÙˆØ§ØªÙŠØ± Ø§Ù„Ù…Ø´ØªØ±ÙŠØ§Øª
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-8 press-effect shine-on-hover"
                  onClick={() => setShowPurchaseDialog(true)}
                >
                  <Plus className="w-3.5 h-3.5 ml-1" />
                  ÙØ§ØªÙˆØ±Ø© Ø¬Ø¯ÙŠØ¯Ø©
                </Button>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {loadingPurchases && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-muted/50 rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingPurchases &&
                    purchasesData?.map(inv => (
                      <div
                        key={inv.id}
                        className="datagrid flex items-center justify-between p-3.5 rounded-xl hover-lift transition-all"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-foreground font-mono">
                            {inv.invoiceNumber}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Truck className="w-3 h-3" />
                            {inv.supplierName || supplierNameOf(inv.supplierId)}
                          </p>
                          <p className="text-[11px] text-muted-foreground/70 font-mono">
                            {new Date(inv.invoiceDate).toLocaleDateString(
                              "ar-EG"
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <Badge
                            className={`text-[11px] font-bold ${statusColorsMap[inv.status] || ""}`}
                          >
                            {statusLabelsMap[inv.status] || inv.status}
                          </Badge>
                          <p className="font-bold text-sm text-destructive font-mono">
                            {inv.total}{" "}
                            {inv.currency ||
                              (currenciesQ.data || []).find(
                                (currency: any) =>
                                  currency.id === inv.currencyId
                              )?.code ||
                              "YER"}
                          </p>
                          <p className="text-[10px] text-muted-foreground/70 font-mono">
                            Ù…Ø¯ÙÙˆØ¹:{" "}
                            {Number(inv.paidAmount || 0).toLocaleString(
                              "en-US"
                            )}{" "}
                            Â· Ù…ØªØ¨Ù‚ÙŠ:{" "}
                            {(
                              Number(inv.total) - Number(inv.paidAmount || 0)
                            ).toLocaleString("en-US")}
                          </p>
                          {inv.status !== "cancelled" &&
                            Number(inv.total) - Number(inv.paidAmount || 0) >
                              0.01 && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] h-7 text-success border-success/20 hover:bg-success/10/40 press-effect"
                                onClick={() => openPayDialog(inv, "purchases")}
                              >
                                <Wallet className="w-3 h-3 ml-1" /> Ø¯ÙØ¹Ø©
                              </Button>
                            )}
                          {inv.status !== "cancelled" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-7 text-destructive border-destructive/20 hover:bg-destructive/10/40 press-effect"
                              disabled={updatePurchaseStatus.isPending}
                              onClick={() => {
                                if (
                                  confirm(
                                    "Ø¥Ù„ØºØ§Ø¡ Ø§Ù„ÙØ§ØªÙˆØ±Ø©ØŸ Ø³ÙŠØªÙ… Ø¹ÙƒØ³ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† ÙˆØ§Ù„Ø±ØµÙŠØ¯."
                                  )
                                )
                                  updatePurchaseStatus.mutate({
                                    id: inv.id,
                                    status: "cancelled",
                                  });
                              }}
                            >
                              Ø¥Ù„ØºØ§Ø¡
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  {(!purchasesData || purchasesData.length === 0) && (
                    <div className="empty-state rounded-2xl border border-border bg-surface p-8 text-center">
                      <div className="empty-state-icon mx-auto mb-3">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                      <h4 className="text-sm font-bold text-foreground mb-1">
                        Ù„Ø§ ØªÙˆØ¬Ø¯ ÙÙˆØ§ØªÙŠØ± Ù…Ø´ØªØ±ÙŠØ§Øª
                      </h4>
                      <p className="text-xs text-muted-foreground mb-4">
                        Ø§Ø¨Ø¯Ø£ Ø¨ØªØ³Ø¬ÙŠÙ„ ÙØ§ØªÙˆØ±Ø© Ø´Ø±Ø§Ø¡ Ø¬Ø¯ÙŠØ¯Ø©
                        Ù…Ù† Ø§Ù„Ù…ÙˆØ±Ø¯ÙŠÙ†
                      </p>
                      <Button
                        size="sm"
                        className="bg-brand hover:bg-brand-deep text-ink-deep text-xs h-8 press-effect"
                        onClick={() => setShowPurchaseDialog(true)}
                      >
                        <Plus className="w-3.5 h-3.5 ml-1" />
                        Ø¥Ù†Ø´Ø§Ø¡ ÙØ§ØªÙˆØ±Ø© Ø´Ø±Ø§Ø¡
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* â”€â”€â”€ Orders Tab â”€â”€â”€ */}
          <TabsContent value="orders">
            <Card className="panel-premium shadow-modern-soft">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-ink">
                  Ø·Ù„Ø¨Ø§Øª Ø§Ù„ØªÙˆØ²ÙŠØ¹
                  {pendingWebOrders > 0 && (
                    <Badge className="mr-2 text-[9px] bg-purple-100 text-purple-700">
                      Ø·Ù„Ø¨Ø§Øª Ø§Ù„Ù…ØªØ¬Ø± Ø§Ù„Ù…Ø¹Ù„Ù‚Ø© Ø¶Ù…Ù†
                      Ø§Ù„ØµÙØ­Ø©: {pendingWebOrders}
                    </Badge>
                  )}
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-8"
                  onClick={() => setShowOrderDialog(true)}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  Ø·Ù„Ø¨ Ø¬Ø¯ÙŠØ¯
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {loadingOrders && (
                    <div className="space-y-2">
                      {[1, 2, 3].map(i => (
                        <div
                          key={i}
                          className="h-16 bg-muted rounded-lg animate-pulse"
                        />
                      ))}
                    </div>
                  )}
                  {!loadingOrders &&
                    ordersData?.map(o => (
                      <div
                        key={o.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                      >
                        <div>
                          <p className="font-bold text-xs text-ink flex items-center gap-2">
                            {o.orderNumber}
                            {isWebOrder(o) && (
                              <Badge className="text-[9px] bg-purple-100 text-purple-700">
                                Ù…ØªØ¬Ø± Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ
                              </Badge>
                            )}
                          </p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {o.customerName ||
                              customerNameOf(o.customerId)} â€¢{" "}
                            {o.deliveryAddress || "Ø¨Ø¯ÙˆÙ† Ø¹Ù†ÙˆØ§Ù†"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Select
                            value={o.status}
                            onValueChange={v =>
                              updateOrderStatus.mutate({
                                id: o.id,
                                status: v as any,
                              })
                            }
                          >
                            <SelectTrigger className="w-24 h-7 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">
                                Ù‚ÙŠØ¯ Ø§Ù„Ø§Ù†ØªØ¸Ø§Ø±
                              </SelectItem>
                              <SelectItem value="confirmed">
                                Ù…Ø¤ÙƒØ¯
                              </SelectItem>
                              <SelectItem value="processing">
                                Ù‚ÙŠØ¯ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©
                              </SelectItem>
                              <SelectItem value="shipped">
                                ØªÙ… Ø§Ù„Ø´Ø­Ù†
                              </SelectItem>
                              <SelectItem value="delivered">
                                ØªÙ… Ø§Ù„ØªÙˆØµÙŠÙ„
                              </SelectItem>
                              <SelectItem value="cancelled">
                                Ù…Ù„ØºÙŠ
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="font-bold text-xs text-ink">
                            {o.total} Ø±.ÙŠ
                          </p>
                          {isWebOrder(o) &&
                            o.status !== "cancelled" &&
                            o.status !== "delivered" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[9px] h-6 text-ink border-brand/40 hover:bg-muted"
                                onClick={() => {
                                  setConvertForm({
                                    paymentMethod: "cash",
                                    paidAmount: "0",
                                  });
                                  setConvertOrder(o);
                                }}
                              >
                                <ReceiptText className="w-3 h-3" /> ÙØ§ØªÙˆØ±Ø©
                                Ù…Ø¨ÙŠØ¹Ø§Øª
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}
                  {(!ordersData || ordersData.length === 0) && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Ù„Ø§ ØªÙˆØ¬Ø¯ Ø·Ù„Ø¨Ø§Øª
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* â”€â”€â”€ Offers Tab (Module B) â”€â”€â”€ */}
          <TabsContent value="offers">
            <Card className="panel-premium shadow-modern-soft">
              <CardHeader className="flex flex-row items-center justify-between p-3">
                <CardTitle className="text-sm font-bold text-ink">
                  Ø§Ù„Ø¹Ø±ÙˆØ¶ Ø§Ù„Ù…Ø§Ù„ÙŠØ© ÙˆØ§Ù„ÙƒÙ…ÙŠØ©
                </CardTitle>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep text-xs h-8"
                  onClick={() => setShowOfferDialog(true)}
                >
                  <Plus className="w-3 h-3 ml-1" />
                  Ø¹Ø±Ø¶ Ø¬Ø¯ÙŠØ¯
                </Button>
              </CardHeader>
              <CardContent className="p-3">
                <div className="space-y-2">
                  {(offersData ?? []).map((o: any) => (
                    <div
                      key={o.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                    >
                      <div>
                        <p className="font-bold text-xs text-ink">{o.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {o.kind === "financial"
                            ? "Ø®ØµÙ… Ù…Ø§Ù„ÙŠ"
                            : "Ø¹Ø±Ø¶ ÙƒÙ…ÙŠ"}{" "}
                          â€¢ {Number(o.discountPercent)}% Ø®ØµÙ…
                          {o.minQty ? ` â€¢ Ø­Ø¯ Ø£Ø¯Ù†Ù‰ ${o.minQty}` : ""}
                          {!o.isActive && " â€¢ ØºÙŠØ± Ù†Ø´Ø·"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7"
                          onClick={() =>
                            setEditOffer({
                              id: o.id,
                              name: o.name,
                              kind: o.kind,
                              discountPercent: String(o.discountPercent),
                              minQty: o.minQty ?? "",
                              productId: o.productId ?? undefined,
                              categoryId: o.categoryId ?? undefined,
                              startDate: o.startDate
                                ? o.startDate.slice(0, 10)
                                : "",
                              endDate: o.endDate ? o.endDate.slice(0, 10) : "",
                              isActive: o.isActive,
                            })
                          }
                        >
                          ØªØ¹Ø¯ÙŠÙ„
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[10px] h-7 text-destructive"
                          onClick={() => {
                            if (confirm("Ø­Ø°Ù Ø§Ù„Ø¹Ø±Ø¶ØŸ"))
                              deleteOffer.mutate({ id: o.id });
                          }}
                        >
                          Ø­Ø°Ù
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!offersData || offersData.length === 0) && (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      Ù„Ø§ ØªÙˆØ¬Ø¯ Ø¹Ø±ÙˆØ¶
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          {activeTab !== "offers" &&
            (() => {
              const total =
                activeTab === "products"
                  ? (productsResponse?.total ?? 0)
                  : activeTab === "customers"
                    ? (customersResponse?.total ?? 0)
                    : activeTab === "suppliers"
                      ? (suppliersResponse?.total ?? 0)
                      : activeTab === "sales"
                        ? (salesResponse?.total ?? 0)
                        : activeTab === "purchases"
                          ? (purchasesResponse?.total ?? 0)
                          : (ordersResponse?.total ?? 0);
              const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
              const first = total === 0 ? 0 : page * PAGE_SIZE + 1;
              const last = Math.min((page + 1) * PAGE_SIZE, total);
              return (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
                  <p className="text-muted-foreground" aria-live="polite">
                    Ø¹Ø±Ø¶ {first}â€“{last} Ù…Ù† {total.toLocaleString("ar-EG")}{" "}
                    Ù†ØªÙŠØ¬Ø©
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={page === 0}
                      onClick={() =>
                        setPage(current => Math.max(0, current - 1))
                      }
                    >
                      Ø§Ù„Ø³Ø§Ø¨Ù‚
                    </Button>
                    <span className="min-w-20 text-center text-xs text-muted-foreground">
                      ØµÙØ­Ø© {page + 1} Ù…Ù† {pageCount}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={page + 1 >= pageCount}
                      onClick={() => setPage(current => current + 1)}
                    >
                      Ø§Ù„ØªØ§Ù„ÙŠ
                    </Button>
                  </div>
                </div>
              );
            })()}
        </Tabs>
      </main>

      {/* â”€â”€â”€ Product Dialog â”€â”€â”€ */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              Ø¥Ø¶Ø§ÙØ© Ù…Ù†ØªØ¬ Ø¬Ø¯ÙŠØ¯
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">ÙƒÙˆØ¯ Ø§Ù„Ù…Ù†ØªØ¬</Label>
                <Input
                  value={productForm.code}
                  onChange={e =>
                    setProductForm({ ...productForm, code: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬</Label>
                <Input
                  value={productForm.name}
                  onChange={e =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ø§Ù„ÙØ¦Ø©</Label>
                <Input
                  value={productForm.category}
                  onChange={e =>
                    setProductForm({ ...productForm, category: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Ø§Ù„ÙˆØ­Ø¯Ø©</Label>
                <Input
                  value={productForm.unit}
                  onChange={e =>
                    setProductForm({ ...productForm, unit: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ø³Ø¹Ø± Ø§Ù„Ø´Ø±Ø§Ø¡</Label>
                <Input
                  type="number"
                  value={productForm.purchasePrice}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      purchasePrice: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Ø³Ø¹Ø± Ø§Ù„Ø¨ÙŠØ¹</Label>
                <Input
                  type="number"
                  value={productForm.salePrice}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      salePrice: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">
                  Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ Ù„Ù„Ù…Ø®Ø²ÙˆÙ†
                </Label>
                <Input
                  type="number"
                  value={productForm.minStock}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      minStock: parseInt(e.target.value) || 0,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">
                  Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯ (Ù…Ø³Ø­/Ø¥Ø¯Ø®Ø§Ù„)
                </Label>
                <BarcodeScanner
                  value={productForm.barcode}
                  onChange={v => setProductForm({ ...productForm, barcode: v })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ù†ÙˆØ¹ Ø§Ù„ØµÙ†Ù</Label>
                <select
                  className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                  value={productForm.productType}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      productType: e.target.value,
                    })
                  }
                >
                  <option value="goods">Ø³Ù„Ø¹Ø©</option>
                  <option value="service">Ø®Ø¯Ù…Ø©</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px]">ÙˆØ­Ø¯Ø© Ø§Ù„Ù‚ÙŠØ§Ø³</Label>
                <Input
                  value={productForm.unitOfMeasure}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      unitOfMeasure: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                  placeholder="Ù…Ø«Ù„: ÙƒØ¬Ù…ØŒ Ù„ØªØ±ØŒ Ø¹Ù„Ø¨Ø©"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">
                  Ø§Ù„ÙˆØ­Ø¯Ø© Ø§Ù„ÙØ±Ø¹ÙŠØ©
                </Label>
                <Input
                  value={productForm.secondaryUnit}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      secondaryUnit: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Ù…Ø¹Ø§Ù…Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„</Label>
                <Input
                  type="number"
                  value={productForm.conversionFactor}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      conversionFactor: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-1 text-[10px]">
                  <input
                    type="checkbox"
                    checked={productForm.isComposite}
                    onChange={e =>
                      setProductForm({
                        ...productForm,
                        isComposite: e.target.checked,
                      })
                    }
                  />{" "}
                  ØµÙ†Ù Ù…Ø±ÙƒØ¨
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ù…ÙƒÙˆÙ†Ø§Øª (BOM) JSON</Label>
                <Input
                  value={productForm.bom}
                  onChange={e =>
                    setProductForm({ ...productForm, bom: e.target.value })
                  }
                  className="h-8 text-xs"
                  placeholder='[{"productId":1,"qty":2}]'
                />
              </div>
              <div>
                <Label className="text-[10px]">
                  Ø£ØµÙ†Ø§Ù Ø¨Ø¯ÙŠÙ„Ø© (JSON)
                </Label>
                <Input
                  value={productForm.alternativeIds}
                  onChange={e =>
                    setProductForm({
                      ...productForm,
                      alternativeIds: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                  placeholder="[2,3]"
                />
              </div>
            </div>

            <div>
              <Label className="text-[10px]">
                Ø±Ø§Ø¨Ø· Ù…Ø±ÙÙ‚ (ØµÙˆØ±Ø©/Ù…Ù„Ù)
              </Label>
              <Input
                value={productForm.attachmentUrl}
                onChange={e =>
                  setProductForm({
                    ...productForm,
                    attachmentUrl: e.target.value,
                  })
                }
                className="h-8 text-xs"
                placeholder="https://..."
              />
            </div>

            {productForm.productType === "service" && (
              <div className="border rounded-lg p-2 space-y-2 bg-warning/10/50">
                <p className="text-[10px] font-bold text-ink">
                  ØªØ³Ø¹ÙŠØ± Ø§Ù„Ø®Ø¯Ù…Ø© (ØªÙƒÙ„ÙØ© Ø¯Ù‚ÙŠÙ‚Ø©/Ù…Ø±Ù†Ø©)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">
                      Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„ØªÙƒÙ„ÙØ©
                    </Label>
                    <select
                      className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                      value={productForm.costMethod}
                      onChange={e =>
                        setProductForm({
                          ...productForm,
                          costMethod: e.target.value,
                        })
                      }
                    >
                      <option value="fixed">Ø«Ø§Ø¨ØªØ©</option>
                      <option value="calculated">Ù…Ø­Ø³ÙˆØ¨Ø©</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px]">
                      ØªÙƒÙ„ÙØ© Ù…Ø¨Ø§Ø´Ø±Ø©
                    </Label>
                    <Input
                      type="number"
                      value={productForm.directCost}
                      onChange={e =>
                        setProductForm({
                          ...productForm,
                          directCost: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">
                      ØªÙƒÙ„ÙØ© ØºÙŠØ± Ù…Ø¨Ø§Ø´Ø±Ø©
                    </Label>
                    <Input
                      type="number"
                      value={productForm.indirectCost}
                      onChange={e =>
                        setProductForm({
                          ...productForm,
                          indirectCost: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[10px]">Ø¯Ù‚Ø§Ø¦Ù‚ Ø¥Ù†ØªØ§Ø¬</Label>
                    <Input
                      type="number"
                      value={productForm.productionMinutes}
                      onChange={e =>
                        setProductForm({
                          ...productForm,
                          productionMinutes: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">ÙˆØ¶Ø¹ Ø§Ù„Ø³Ø¹Ø±</Label>
                    <select
                      className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                      value={productForm.priceMode}
                      onChange={e =>
                        setProductForm({
                          ...productForm,
                          priceMode: e.target.value,
                        })
                      }
                    >
                      <option value="margin">Ù‡Ø§Ù…Ø´</option>
                      <option value="direct">Ù…Ø¨Ø§Ø´Ø±</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[10px]">
                      Ù†Ø³Ø¨Ø© Ø§Ù„Ù‡Ø§Ù…Ø´ %
                    </Label>
                    <Input
                      type="number"
                      value={productForm.marginPct}
                      onChange={e =>
                        setProductForm({
                          ...productForm,
                          marginPct: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯</Label>
                <AcctSelect
                  value={productForm.salesAccountId}
                  onChange={v =>
                    setProductForm({ ...productForm, salesAccountId: v })
                  }
                  accounts={accountsQuery.data}
                />
              </div>
              <div>
                <Label className="text-[10px]">Ø­Ø³Ø§Ø¨ Ø§Ù„ØªÙƒÙ„ÙØ©</Label>
                <AcctSelect
                  value={productForm.cogsAccountId}
                  onChange={v =>
                    setProductForm({ ...productForm, cogsAccountId: v })
                  }
                  accounts={accountsQuery.data}
                />
              </div>
              <div>
                <Label className="text-[10px]">Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†</Label>
                <AcctSelect
                  value={productForm.inventoryAccountId}
                  onChange={v =>
                    setProductForm({ ...productForm, inventoryAccountId: v })
                  }
                  accounts={accountsQuery.data}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProductDialog(false)}
              className="h-8 text-xs"
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep h-8 text-xs"
              disabled={isCreatingProduct}
              onClick={() => createProduct.mutate(productForm as any)}
            >
              {isCreatingProduct ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : "Ø­ÙØ¸"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Customer Dialog â”€â”€â”€ */}
      <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              Ø¥Ø¶Ø§ÙØ© Ø¹Ù…ÙŠÙ„ Ø¬Ø¯ÙŠØ¯
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">ÙƒÙˆØ¯ Ø§Ù„Ø¹Ù…ÙŠÙ„</Label>
                <Input
                  value={customerForm.code}
                  onChange={e =>
                    setCustomerForm({ ...customerForm, code: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Ø§Ø³Ù… Ø§Ù„Ø¹Ù…ÙŠÙ„</Label>
                <Input
                  value={customerForm.name}
                  onChange={e =>
                    setCustomerForm({ ...customerForm, name: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ø§Ù„Ù‡Ø§ØªÙ</Label>
                <Input
                  value={customerForm.phone}
                  onChange={e =>
                    setCustomerForm({ ...customerForm, phone: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©</Label>
                <Input
                  value={customerForm.city}
                  onChange={e =>
                    setCustomerForm({ ...customerForm, city: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">Ø§Ù„Ø¹Ù†ÙˆØ§Ù†</Label>
              <Input
                value={customerForm.address}
                onChange={e =>
                  setCustomerForm({ ...customerForm, address: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCustomerDialog(false)}
              className="h-8 text-xs"
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep h-8 text-xs"
              disabled={isCreatingCustomer}
              onClick={() => createCustomer.mutate(customerForm)}
            >
              {isCreatingCustomer ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : "Ø­ÙØ¸"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Supplier Dialog â”€â”€â”€ */}
      <Dialog open={showSupplierDialog} onOpenChange={setShowSupplierDialog}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              Ø¥Ø¶Ø§ÙØ© Ù…ÙˆØ±Ø¯ Ø¬Ø¯ÙŠØ¯
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">ÙƒÙˆØ¯ Ø§Ù„Ù…ÙˆØ±Ø¯</Label>
                <Input
                  value={supplierForm.code}
                  onChange={e =>
                    setSupplierForm({ ...supplierForm, code: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Ø§Ø³Ù… Ø§Ù„Ù…ÙˆØ±Ø¯</Label>
                <Input
                  value={supplierForm.name}
                  onChange={e =>
                    setSupplierForm({ ...supplierForm, name: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ø§Ù„Ù‡Ø§ØªÙ</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={e =>
                    setSupplierForm({ ...supplierForm, phone: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©</Label>
                <Input
                  value={supplierForm.city}
                  onChange={e =>
                    setSupplierForm({ ...supplierForm, city: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">Ø§Ù„Ø¹Ù†ÙˆØ§Ù†</Label>
              <Input
                value={supplierForm.address}
                onChange={e =>
                  setSupplierForm({ ...supplierForm, address: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSupplierDialog(false)}
              className="h-8 text-xs"
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep h-8 text-xs"
              disabled={isCreatingSupplier}
              onClick={() => createSupplier.mutate(supplierForm)}
            >
              {isCreatingSupplier ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : "Ø­ÙØ¸"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Customer Detail Dialog (custom fields) â”€â”€â”€ */}
      <Dialog open={customerDetailOpen} onOpenChange={setCustomerDetailOpen}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ø¹Ù…ÙŠÙ„: {selectedCustomer?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="text-[11px] text-muted-foreground space-y-1">
            <p>Ø§Ù„ÙƒÙˆØ¯: {selectedCustomer?.code}</p>
            <p>Ø§Ù„Ù‡Ø§ØªÙ: {selectedCustomer?.phone}</p>
            <p>Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©: {selectedCustomer?.city}</p>
          </div>
          {selectedCustomer && (
            <CustomFields
              entityType="customer"
              entityId={selectedCustomer.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Supplier Detail Dialog (custom fields) â”€â”€â”€ */}
      <Dialog open={supplierDetailOpen} onOpenChange={setSupplierDetailOpen}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              ØªÙØ§ØµÙŠÙ„ Ø§Ù„Ù…ÙˆØ±Ø¯: {selectedSupplier?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="text-[11px] text-muted-foreground space-y-1">
            <p>Ø§Ù„ÙƒÙˆØ¯: {selectedSupplier?.code}</p>
            <p>Ø§Ù„Ù‡Ø§ØªÙ: {selectedSupplier?.phone}</p>
            <p>Ø§Ù„Ù…Ø¯ÙŠÙ†Ø©: {selectedSupplier?.city}</p>
          </div>
          {selectedSupplier && (
            <CustomFields
              entityType="supplier"
              entityId={selectedSupplier.id}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Offers Dialog (Module B) â”€â”€â”€ */}
      <Dialog open={showOfferDialog} onOpenChange={setShowOfferDialog}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              Ø¹Ø±Ø¶ Ø¬Ø¯ÙŠØ¯
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-[10px]">Ø§Ù„Ø§Ø³Ù…</Label>
              <Input
                value={offerForm.name}
                onChange={e =>
                  setOfferForm({ ...offerForm, name: e.target.value })
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ø§Ù„Ù†ÙˆØ¹</Label>
                <select
                  className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                  value={offerForm.kind}
                  onChange={e =>
                    setOfferForm({ ...offerForm, kind: e.target.value })
                  }
                >
                  <option value="financial">Ø®ØµÙ… Ù…Ø§Ù„ÙŠ</option>
                  <option value="quantity">Ø¹Ø±Ø¶ ÙƒÙ…ÙŠ</option>
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Ù†Ø³Ø¨Ø© Ø§Ù„Ø®ØµÙ… %</Label>
                <Input
                  value={offerForm.discountPercent}
                  onChange={e =>
                    setOfferForm({
                      ...offerForm,
                      discountPercent: e.target.value,
                    })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">
                  Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ Ù„Ù„ÙƒÙ…ÙŠØ©
                </Label>
                <Input
                  value={offerForm.minQty}
                  onChange={e =>
                    setOfferForm({ ...offerForm, minQty: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">
                  Ù…Ù†ØªØ¬ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)
                </Label>
                <select
                  className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                  value={offerForm.productId ?? ""}
                  onChange={e =>
                    setOfferForm({
                      ...offerForm,
                      productId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                >
                  <option value="">ÙƒÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</option>
                  {(productsForOffer.data?.items ?? []).map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-[10px]">ØªØµÙ†ÙŠÙ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)</Label>
              <select
                className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                value={offerForm.categoryId ?? ""}
                onChange={e =>
                  setOfferForm({
                    ...offerForm,
                    categoryId: e.target.value
                      ? Number(e.target.value)
                      : undefined,
                  })
                }
              >
                <option value="">ÙƒÙ„ Ø§Ù„ØªØµÙ†ÙŠÙØ§Øª</option>
                {(catsForOffer.data ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">
                  ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©
                </Label>
                <Input
                  type="date"
                  value={offerForm.startDate}
                  onChange={e =>
                    setOfferForm({ ...offerForm, startDate: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-[10px]">
                  ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ù‡Ø§ÙŠØ©
                </Label>
                <Input
                  type="date"
                  value={offerForm.endDate}
                  onChange={e =>
                    setOfferForm({ ...offerForm, endDate: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-[11px]">
              <input
                type="checkbox"
                checked={offerForm.isActive}
                onChange={e =>
                  setOfferForm({ ...offerForm, isActive: e.target.checked })
                }
              />
              Ù†Ø´Ø·
            </label>
            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOfferDialog(false)}
                className="h-8 text-xs"
              >
                Ø¥Ù„ØºØ§Ø¡
              </Button>
              <Button
                size="sm"
                className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep h-8 text-xs"
                disabled={!offerForm.name || createOffer.isPending}
                onClick={() =>
                  createOffer.mutate({
                    name: offerForm.name,
                    kind: offerForm.kind,
                    discountPercent: offerForm.discountPercent || "0",
                    minQty: offerForm.minQty || undefined,
                    productId: offerForm.productId,
                    categoryId: offerForm.categoryId,
                    startDate: offerForm.startDate || undefined,
                    endDate: offerForm.endDate || undefined,
                  })
                }
              >
                {createOffer.isPending ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : "Ø­ÙØ¸"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Offers Edit Dialog (Module B) â”€â”€â”€ */}
      <Dialog open={!!editOffer} onOpenChange={o => !o && setEditOffer(null)}>
        <DialogContent className="bg-card max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              ØªØ¹Ø¯ÙŠÙ„ Ø§Ù„Ø¹Ø±Ø¶
            </DialogTitle>
          </DialogHeader>
          {editOffer && (
            <div className="space-y-3">
              <div>
                <Label className="text-[10px]">Ø§Ù„Ø§Ø³Ù…</Label>
                <Input
                  value={editOffer.name}
                  onChange={e =>
                    setEditOffer({ ...editOffer, name: e.target.value })
                  }
                  className="h-8 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Ø§Ù„Ù†ÙˆØ¹</Label>
                  <select
                    className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                    value={editOffer.kind}
                    onChange={e =>
                      setEditOffer({ ...editOffer, kind: e.target.value })
                    }
                  >
                    <option value="financial">Ø®ØµÙ… Ù…Ø§Ù„ÙŠ</option>
                    <option value="quantity">Ø¹Ø±Ø¶ ÙƒÙ…ÙŠ</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px]">Ù†Ø³Ø¨Ø© Ø§Ù„Ø®ØµÙ… %</Label>
                  <Input
                    value={editOffer.discountPercent}
                    onChange={e =>
                      setEditOffer({
                        ...editOffer,
                        discountPercent: e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">
                    Ø§Ù„Ø­Ø¯ Ø§Ù„Ø£Ø¯Ù†Ù‰ Ù„Ù„ÙƒÙ…ÙŠØ©
                  </Label>
                  <Input
                    value={editOffer.minQty}
                    onChange={e =>
                      setEditOffer({ ...editOffer, minQty: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">
                    Ù…Ù†ØªØ¬ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)
                  </Label>
                  <select
                    className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                    value={editOffer.productId ?? ""}
                    onChange={e =>
                      setEditOffer({
                        ...editOffer,
                        productId: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                  >
                    <option value="">ÙƒÙ„ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª</option>
                    {(productsForOffer.data?.items ?? []).map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-[10px]">
                  ØªØµÙ†ÙŠÙ (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)
                </Label>
                <select
                  className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                  value={editOffer.categoryId ?? ""}
                  onChange={e =>
                    setEditOffer({
                      ...editOffer,
                      categoryId: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    })
                  }
                >
                  <option value="">ÙƒÙ„ Ø§Ù„ØªØµÙ†ÙŠÙØ§Øª</option>
                  {(catsForOffer.data ?? []).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">
                    ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¨Ø¯Ø§ÙŠØ©
                  </Label>
                  <Input
                    type="date"
                    value={editOffer.startDate}
                    onChange={e =>
                      setEditOffer({ ...editOffer, startDate: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">
                    ØªØ§Ø±ÙŠØ® Ø§Ù„Ù†Ù‡Ø§ÙŠØ©
                  </Label>
                  <Input
                    type="date"
                    value={editOffer.endDate}
                    onChange={e =>
                      setEditOffer({ ...editOffer, endDate: e.target.value })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  checked={editOffer.isActive}
                  onChange={e =>
                    setEditOffer({ ...editOffer, isActive: e.target.checked })
                  }
                />
                Ù†Ø´Ø·
              </label>
              <DialogFooter>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditOffer(null)}
                  className="h-8 text-xs"
                >
                  Ø¥Ù„ØºØ§Ø¡
                </Button>
                <Button
                  size="sm"
                  className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep h-8 text-xs"
                  disabled={!editOffer.name || updateOffer.isPending}
                  onClick={() =>
                    updateOffer.mutate({
                      id: editOffer.id,
                      name: editOffer.name,
                      kind: editOffer.kind,
                      discountPercent: editOffer.discountPercent || "0",
                      minQty: editOffer.minQty || undefined,
                      productId: editOffer.productId,
                      categoryId: editOffer.categoryId,
                      isActive: editOffer.isActive,
                    })
                  }
                >
                  {updateOffer.isPending ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø­ÙØ¸..." : "Ø­ÙØ¸"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Sale Dialog â”€â”€â”€ */}
      <Dialog open={showSaleDialog} onOpenChange={setShowSaleDialog}>
        <DialogContent className="bg-card max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª Ø¬Ø¯ÙŠØ¯Ø© / Ù†Ù‚Ø·Ø© Ø¨ÙŠØ¹
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ø§Ù„Ø¹Ù…ÙŠÙ„</Label>
                <Select
                  value={saleCustomerId?.toString() || ""}
                  onValueChange={v => setSaleCustomerId(parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Ø§Ø®ØªØ± Ø¹Ù…ÙŠÙ„" />
                  </SelectTrigger>
                  <SelectContent>
                    {customersData?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹</Label>
                <Select
                  value={salePayment}
                  onValueChange={v => setSalePayment(v as any)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Ù†Ù‚Ø¯ÙŠ</SelectItem>
                    <SelectItem value="card">Ø¨Ø·Ø§Ù‚Ø©</SelectItem>
                    <SelectItem value="transfer">ØªØ­ÙˆÙŠÙ„</SelectItem>
                    <SelectItem value="credit">Ø¢Ø¬Ù„</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ø§Ù„Ø¹Ù…Ù„Ø©</Label>
                <Select
                  value={saleCurrency}
                  onValueChange={v => {
                    setSaleCurrency(v);
                    const c = (currenciesQ.data || []).find(
                      (x: any) => x.code === v
                    );
                    setSaleCurrencyRate(c ? String(c.rate) : "1");
                  }}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Ø§Ù„Ø¹Ù…Ù„Ø©" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YER">Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ (YER)</SelectItem>
                    {(currenciesQ.data || [])
                      .filter((c: any) => c.code !== "YER")
                      .map((c: any) => (
                        <SelectItem key={c.id} value={c.code}>
                          {c.code} â€” {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Ø³Ø¹Ø± Ø§Ù„ØµØ±Ù</Label>
                <Input
                  type="number"
                  min="0.00000001"
                  step="0.00000001"
                  inputMode="decimal"
                  dir="ltr"
                  value={saleCurrencyRate}
                  onChange={e => setSaleCurrencyRate(e.target.value)}
                  className="min-h-10 text-xs"
                />
              </div>
            </div>
            <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
              <Label className="text-xs font-bold">
                ØªØ¹Ø¨Ø¦Ø© Ø§Ù„ØªÙØ§ØµÙŠÙ„ Ù…Ù† Ù…ØµØ¯Ø± Ø³Ø§Ø¨Ù‚
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <Select value={saleSource} onValueChange={setSaleSource}>
                  <SelectTrigger className="min-h-10 text-xs">
                    <SelectValue placeholder="Ø§Ø®ØªØ± ÙØ§ØªÙˆØ±Ø© Ø£Ùˆ Ø·Ù„Ø¨Ø§Ù‹ Ø­Ø¯ÙŠØ«Ø§Ù‹" />
                  </SelectTrigger>
                  <SelectContent>
                    {(recentSalesForInvoiceQ.data?.items ?? []).map(invoice => (
                      <SelectItem
                        key={`invoice:${invoice.id}`}
                        value={`invoice:${invoice.id}`}
                      >
                        ÙØ§ØªÙˆØ±Ø© {invoice.invoiceNumber} â€”{" "}
                        {invoice.customerName || "Ø¨Ø¯ÙˆÙ† Ø¹Ù…ÙŠÙ„"}
                      </SelectItem>
                    ))}
                    {(recentOrdersForInvoiceQ.data?.items ?? []).map(order => (
                      <SelectItem
                        key={`order:${order.id}`}
                        value={`order:${order.id}`}
                      >
                        Ø·Ù„Ø¨ {order.orderNumber} â€”{" "}
                        {order.customerName || "Ø¨Ø¯ÙˆÙ† Ø¹Ù…ÙŠÙ„"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 text-xs"
                  onClick={loadSaleSource}
                  disabled={
                    !saleSource ||
                    saleSourceInvoiceQ.isFetching ||
                    saleSourceOrderItemsQ.isFetching
                  }
                >
                  {saleSourceInvoiceQ.isFetching ||
                  saleSourceOrderItemsQ.isFetching
                    ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„..."
                    : "ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨Ù†ÙˆØ¯"}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={saleImportInputRef}
                  type="file"
                  accept=".xlsx,.csv,.tsv,.txt,.json,.xml,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/json,text/csv,application/xml"
                  className="hidden"
                  onChange={event => {
                    void importSaleFile(event.target.files?.[0]);
                    event.currentTarget.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 text-xs"
                  onClick={() => saleImportInputRef.current?.click()}
                  disabled={importingSaleFile}
                >
                  <Upload className="h-4 w-4 ml-1" />
                  {importingSaleFile
                    ? "Ø¬Ø§Ø±ÙŠ ØªØ­Ù„ÙŠÙ„ Ø§Ù„Ù…Ù„Ù..."
                    : "Ø§Ø³ØªÙŠØ±Ø§Ø¯ Excel / CSV / JSON / XML"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 text-xs"
                  disabled={extractingInvoiceImage}
                  onClick={() => {
                    setInvoiceImageTarget("sale");
                    invoiceImageInputRef.current?.click();
                  }}
                >
                  <ScanLine className="h-4 w-4 ml-1" />
                  {extractingInvoiceImage
                    ? "Ø¬Ø§Ø±ÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„ØµÙˆØ±Ø©..."
                    : "Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ù…Ù† ØµÙˆØ±Ø©"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="min-h-10 text-xs"
                  onClick={downloadInvoiceImportTemplate}
                >
                  <Download className="h-4 w-4 ml-1" /> Ù‚Ø§Ù„Ø¨ Ø§Ù„Ø¨Ù†ÙˆØ¯
                </Button>
                <span className="text-[11px] leading-relaxed text-muted-foreground">
                  ÙŠØ·Ø§Ø¨Ù‚ Ø§Ù„Ø¨Ù†ÙˆØ¯ Ù…Ø¹ Ø§Ù„Ø£ØµÙ†Ø§Ù ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª
                  Ø§Ù„Ù…Ø³Ø¬Ù„Ø© Ø¨Ø§Ù„Ø±Ù…Ø² Ø£Ùˆ Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯ Ø£Ùˆ
                  Ø§Ù„Ø§Ø³Ù….
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-[10px]">Ù…ÙˆÙ‚Ø¹ Ø§Ù„Ø¹Ù…Ù„</Label>
                <select
                  className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                  value={saleWorkSiteId ?? ""}
                  onChange={e =>
                    setSaleWorkSiteId(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                >
                  <option value="">â€”</option>
                  {(workSitesQ.data || []).map(w => (
                    <option key={w.id} value={w.id}>
                      {w.code} - {w.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Ø§Ù„Ø¬Ù‡Ø§Ø²</Label>
                <select
                  className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                  value={saleDeviceId ?? ""}
                  onChange={e =>
                    setSaleDeviceId(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                >
                  <option value="">â€”</option>
                  {(devicesQ.data || []).map(d => (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-[10px]">Ø§Ù„Ø¥Ø­Ø¯Ø§Ø«ÙŠØ§Øª</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-[10px] w-full"
                  onClick={pickLocation}
                >
                  {saleCoords.lat
                    ? `âœ“ ${saleCoords.lat.slice(0, 6)}`
                    : "ØªØ­Ø¯ÙŠØ¯ Ø§Ù„Ù…ÙˆÙ‚Ø¹"}
                </Button>
              </div>
            </div>
            <div className="border rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-bold">Ø§Ù„Ø£ØµÙ†Ø§Ù</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={addItemToSale}
                >
                  <Plus className="w-3 h-3" />
                  Ø¥Ø¶Ø§ÙØ© ØµÙ†Ù
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] text-brand border-brand/40"
                  onClick={applyOffersToSale}
                  disabled={saleItems.length === 0}
                >
                  <Tag className="w-3 h-3" />
                  ØªØ·Ø¨ÙŠÙ‚ Ø§Ù„Ø¹Ø±ÙˆØ¶
                </Button>
              </div>
              {saleItems.map((item, idx) => {
                const lineTotal =
                  parseFloat(item.unitPrice) * item.quantity -
                  (parseFloat(item.discount) || 0);
                return (
                  <div key={idx} className="flex items-center gap-1.5 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-ink truncate">
                        {item.productName}{" "}
                        {item.productType === "service" && (
                          <span className="text-blue-600">Â· Ø®Ø¯Ù…Ø©</span>
                        )}
                      </p>
                      <p className="text-[9px] text-muted-foreground">
                        {fmtNum(parseFloat(item.unitPrice) * item.quantity)} âˆ’
                        Ø®ØµÙ… {item.discount || "0"} ={" "}
                        <span className="font-bold text-brand">
                          {fmtNum(lineTotal)} {saleCurrency}
                        </span>
                      </p>
                    </div>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={e => {
                        const newItems = [...saleItems];
                        newItems[idx].quantity = parseInt(e.target.value) || 1;
                        setSaleItems(newItems);
                      }}
                      className="h-7 text-[10px] w-14"
                    />
                    <Input
                      type="number"
                      value={item.unitPrice}
                      onChange={e => {
                        const newItems = [...saleItems];
                        newItems[idx].unitPrice = e.target.value;
                        setSaleItems(newItems);
                      }}
                      className="h-7 text-[10px] w-20"
                    />
                    <Input
                      type="number"
                      value={item.discount}
                      placeholder="Ø®ØµÙ…"
                      onChange={e => {
                        const newItems = [...saleItems];
                        newItems[idx].discount = e.target.value;
                        setSaleItems(newItems);
                      }}
                      className="h-7 text-[10px] w-16"
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setSaleItems(saleItems.filter((_, i) => i !== idx))
                      }
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </Button>
                  </div>
                );
              })}
              <div className="flex flex-col gap-1 pt-2 border-t text-[11px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Ø§Ù„Ù…Ø¬Ù…ÙˆØ¹ Ø§Ù„ÙØ±Ø¹ÙŠ
                  </span>
                  <span className="font-bold">
                    {fmtNum(saleTotal)} {saleCurrency}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ø®ØµÙ…
                  </span>
                  <span className="font-bold text-red-500">
                    {fmtNum(saleDiscountTotal)} {saleCurrency}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-bold text-ink">
                    Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„Ù†Ù‡Ø§Ø¦ÙŠ
                  </span>
                  <span className="font-bold text-ink">
                    {fmtNum(saleGrandTotal)} {saleCurrency}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>
                  Ø§Ù„Ù…Ø¹Ø§Ø¯Ù„ Ø¨Ø§Ù„Ø¹Ù…Ù„Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ© (Ã—{" "}
                  {saleCurrencyRate || "1"})
                </span>
                <span dir="ltr">
                  {fmtNum(saleGrandTotal * (Number(saleCurrencyRate) || 0))}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaleDialog(false)}
              className="h-8 text-xs"
            >
              إلغاء
            </Button>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep h-8 text-xs"
              onClick={openSaleReview}
              disabled={
                saleItems.length === 0 ||
                !Number.isFinite(Number(saleCurrencyRate)) ||
                Number(saleCurrencyRate) <= 0
              }
            >
              مراجعة قبل الحفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── مراجعة فاتورة المبيعات قبل الحفظ ─── */}
      <InvoicePreviewDialog
        open={showSaleReview}
        onOpenChange={setShowSaleReview}
        kind="sale"
        title="مراجعة فاتورة المبيعات قبل الحفظ"
        description="راجع البنود والإجماليات، وعدّل الكمية أو السعر أو الخصم أو احذف بنداً قبل الحفظ."
        lines={reviewSaleLines}
        onLinesChange={setReviewSaleLines}
        header={reviewSaleHeader}
        onCancel={() => {
          setShowSaleReview(false);
          toast.info("عدت إلى نموذج الفاتورة لإجراء التعديلات");
        }}
        onConfirm={submitReviewedSale}
        isSaving={isCreatingSale}
        confirmLabel="تأكيد وحفظ الفاتورة"
      />

      {/* â”€â”€â”€ ZATCA e-invoice QR (Saudi) â”€â”€â”€ */}
      <Dialog open={!!zatcaView} onOpenChange={o => !o && setZatcaView(null)}>
        <DialogContent className="bg-card max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              Ø§Ù„ÙØ§ØªÙˆØ±Ø© Ø§Ù„Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠØ© (ZATCA)
            </DialogTitle>
          </DialogHeader>
          {zatcaView && (
            <div className="space-y-2 text-center">
              <p className="text-[11px] text-muted-foreground">
                Ø±Ù…Ø² Ø§Ù„Ø§Ø³ØªØ¬Ø§Ø¨Ø© Ø§Ù„Ø³Ø±ÙŠØ¹Ø© (TLV Base64) â€”
                Ø§Ù„ØµÙ‚Ù‡ ÙÙŠ Ù…ÙˆÙ„Ù‘Ø¯ QR Ù„Ø¹Ø±Ø¶Ù‡ Ù„Ù„Ø¹Ù…ÙŠÙ„ Ø£Ùˆ
                Ø®Ø²Ù‘Ù†Ù‡ Ù…Ø¹ Ø§Ù„ÙØ§ØªÙˆØ±Ø©.
              </p>
              <textarea
                readOnly
                rows={4}
                className="w-full p-2 rounded border border-border text-[10px] font-mono bg-muted"
                value={zatcaView.qrBase64 || ""}
              />
              <p className="text-[10px] text-muted-foreground break-all">
                UUID: {zatcaView.uuid}
              </p>
              <p className="text-[10px] text-muted-foreground break-all">
                Hash: {zatcaView.hash?.slice(0, 32)}â€¦
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Shared Product Picker â”€â”€â”€ */}
      <ProductPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handlePick}
        title={
          pickerMode === "purchase"
            ? "Ø§Ø®ØªØ± Ù…Ù†ØªØ¬Ø§Ù‹ Ù„Ù„Ù…Ø´ØªØ±ÙŠØ§Øª"
            : pickerMode === "order"
              ? "Ø§Ø®ØªØ± Ù…Ù†ØªØ¬Ø§Ù‹ Ù„Ù„Ø·Ù„Ø¨"
              : "Ø§Ø®ØªØ± ØµÙ†ÙØ§Ù‹ Ù„Ù„Ø¨ÙŠØ¹ (Ù†Ù‚Ø·Ø© Ø¨ÙŠØ¹)"
        }
        priceField={pickerMode === "purchase" ? "purchasePrice" : "salePrice"}
      />

      {/* â”€â”€â”€ Purchase Dialog â”€â”€â”€ */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent className="bg-card max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              ÙØ§ØªÙˆØ±Ø© Ù…Ø´ØªØ±ÙŠØ§Øª Ø¬Ø¯ÙŠØ¯Ø©
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">
                  Ø¹Ù…Ù„Ø© Ø§Ù„ÙØ§ØªÙˆØ±Ø©
                </Label>
                <Select
                  value={purchaseCurrency}
                  onValueChange={code => {
                    setPurchaseCurrency(code);
                    const selected = (currenciesQ.data || []).find(
                      (item: any) => item.code === code
                    );
                    setPurchaseExchangeRate(
                      selected ? String(selected.rate) : "1"
                    );
                  }}
                >
                  <SelectTrigger className="min-h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="YER">
                      YER â€” Ø±ÙŠØ§Ù„ ÙŠÙ…Ù†ÙŠ
                    </SelectItem>
                    {(currenciesQ.data || [])
                      .filter((item: any) => item.code !== "YER")
                      .map((item: any) => (
                        <SelectItem key={item.id} value={item.code}>
                          {item.code} â€” {item.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">
                  Ø³Ø¹Ø± Ø§Ù„ØµØ±Ù Ø¥Ù„Ù‰ Ø§Ù„Ø¹Ù…Ù„Ø© Ø§Ù„Ø£Ø³Ø§Ø³ÙŠØ©
                </Label>
                <Input
                  type="number"
                  min="0.00000001"
                  step="0.00000001"
                  inputMode="decimal"
                  dir="ltr"
                  value={purchaseExchangeRate}
                  onChange={event =>
                    setPurchaseExchangeRate(event.target.value)
                  }
                  className="min-h-10 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-[10px]">Ø§Ù„Ù…ÙˆØ±Ø¯</Label>
              <Select
                value={purchaseSupplierId?.toString() || ""}
                onValueChange={v => setPurchaseSupplierId(parseInt(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Ø§Ø®ØªØ± Ù…ÙˆØ±Ø¯" />
                </SelectTrigger>
                <SelectContent>
                  {suppliersData?.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
              <Label className="text-xs font-bold">
                ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨Ù†ÙˆØ¯ Ù…Ù† ÙØ§ØªÙˆØ±Ø© Ø³Ø§Ø¨Ù‚Ø© Ø£Ùˆ
                Ø£Ù…Ø± Ø´Ø±Ø§Ø¡
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                <Select
                  value={purchaseSource}
                  onValueChange={setPurchaseSource}
                >
                  <SelectTrigger className="min-h-10 text-xs">
                    <SelectValue placeholder="Ø§Ø®ØªØ± ÙØ§ØªÙˆØ±Ø© Ø£Ùˆ Ø£Ù…Ø± Ø´Ø±Ø§Ø¡" />
                  </SelectTrigger>
                  <SelectContent>
                    {(recentPurchasesForInvoiceQ.data?.items ?? []).map(
                      invoice => (
                        <SelectItem
                          key={`invoice:${invoice.id}`}
                          value={`invoice:${invoice.id}`}
                        >
                          ÙØ§ØªÙˆØ±Ø© {invoice.invoiceNumber} Â·{" "}
                          {invoice.supplierName || "Ø¨Ø¯ÙˆÙ† Ù…ÙˆØ±Ø¯"}
                        </SelectItem>
                      )
                    )}
                    {(recentPurchaseOrdersQ.data?.items ?? [])
                      .filter(order =>
                        ["issued", "partially_received", "received"].includes(
                          order.status
                        )
                      )
                      .map(order => (
                        <SelectItem
                          key={`po:${order.id}`}
                          value={`po:${order.id}`}
                        >
                          {order.poNumber} Â· {order.status}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-10 text-xs"
                  onClick={loadPurchaseOrder}
                  disabled={
                    !purchaseSourceId ||
                    purchaseSourceOrderQ.isFetching ||
                    purchaseSourceInvoiceItemsQ.isFetching
                  }
                >
                  {purchaseSourceOrderQ.isFetching ||
                  purchaseSourceInvoiceItemsQ.isFetching
                    ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù…ÙŠÙ„..."
                    : "ØªØ­Ù…ÙŠÙ„ Ø§Ù„Ø¨Ù†ÙˆØ¯"}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={purchaseImportInputRef}
                type="file"
                accept=".xlsx,.csv,.tsv,.txt,.json,.xml"
                className="hidden"
                onChange={event => {
                  void importPurchaseFile(event.target.files?.[0]);
                  event.currentTarget.value = "";
                }}
              />
              <input
                ref={invoiceImageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={event => {
                  void importInvoiceImage(
                    event.currentTarget.files?.[0],
                    invoiceImageTarget
                  );
                  event.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-10 text-xs"
                disabled={importingPurchaseFile}
                onClick={() => purchaseImportInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 ml-1" />
                {importingPurchaseFile
                  ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ­Ù„ÙŠÙ„..."
                  : "Ø§Ø³ØªÙŠØ±Ø§Ø¯ ØªÙØ§ØµÙŠÙ„ Ù…Ù† Ù…Ù„Ù"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-10 text-xs"
                disabled={extractingInvoiceImage}
                onClick={() => {
                  setInvoiceImageTarget("purchase");
                  invoiceImageInputRef.current?.click();
                }}
              >
                <ScanLine className="h-4 w-4 ml-1" />
                {extractingInvoiceImage
                  ? "Ø¬Ø§Ø±ÙŠ Ù‚Ø±Ø§Ø¡Ø© Ø§Ù„ØµÙˆØ±Ø©..."
                  : "Ø§Ø³ØªØ®Ø±Ø§Ø¬ Ù…Ù† ØµÙˆØ±Ø©"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="min-h-10 text-xs"
                onClick={downloadInvoiceImportTemplate}
              >
                <Download className="h-4 w-4 ml-1" /> Ù‚Ø§Ù„Ø¨ Ø§Ù„Ø¨Ù†ÙˆØ¯
              </Button>
              <span className="text-[11px] text-muted-foreground">
                Excel ÙˆCSV ÙˆJSON ÙˆXML
              </span>
            </div>
            <div className="border rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-bold">Ø§Ù„Ø£ØµÙ†Ø§Ù</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={addItemToPurchase}
                >
                  <Plus className="w-3 h-3" />
                  Ø¥Ø¶Ø§ÙØ© ØµÙ†Ù
                </Button>
              </div>
              {purchaseItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input
                    value={item.productName}
                    readOnly
                    className="h-7 text-[10px] flex-1"
                  />
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={e => {
                      const newItems = [...purchaseItems];
                      newItems[idx].quantity = parseInt(e.target.value) || 1;
                      setPurchaseItems(newItems);
                    }}
                    className="h-7 text-[10px] w-16"
                  />
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => {
                      const newItems = [...purchaseItems];
                      newItems[idx].unitPrice = e.target.value;
                      setPurchaseItems(newItems);
                    }}
                    className="h-7 text-[10px] w-20"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() =>
                      setPurchaseItems(
                        purchaseItems.filter((_, i) => i !== idx)
                      )
                    }
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <p className="text-sm font-bold text-ink">
                  Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: {fmtNum(purchaseTotal)} {purchaseCurrency}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPurchaseDialog(false)}
              className="h-8 text-xs"
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep h-8 text-xs"
              onClick={() =>
                createPurchase.mutate({
                  supplierId: purchaseSupplierId,
                  poId: purchasePoId,
                  items: purchaseItems,
                  currency: purchaseCurrency,
                  exchangeRate: purchaseExchangeRate,
                  paidAmount: "0",
                  discount: purchaseItems
                    .reduce((s, i) => s + (parseFloat(i.discount) || 0), 0)
                    .toString(),
                })
              }
              disabled={purchaseItems.length === 0 || isCreatingPurchase}
            >
              {isCreatingPurchase
                ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡..."
                : "ØªØ£ÙƒÙŠØ¯ Ø§Ù„ÙØ§ØªÙˆØ±Ø©"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* â”€â”€â”€ Order Dialog â”€â”€â”€ */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="bg-card max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm text-ink">
              Ø·Ù„Ø¨ ØªÙˆØ²ÙŠØ¹ Ø¬Ø¯ÙŠØ¯
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px]">Ø§Ù„Ø¹Ù…ÙŠÙ„</Label>
                <Select
                  value={orderCustomerId?.toString() || ""}
                  onValueChange={v => setOrderCustomerId(parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Ø§Ø®ØªØ± Ø¹Ù…ÙŠÙ„" />
                  </SelectTrigger>
                  <SelectContent>
                    {customersData?.map(c => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px]">Ø¹Ù†ÙˆØ§Ù† Ø§Ù„ØªÙˆØµÙŠÙ„</Label>
                <Input
                  value={orderAddress}
                  onChange={e => setOrderAddress(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
            <div className="border rounded-lg p-2">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-[10px] font-bold">Ø§Ù„Ø£ØµÙ†Ø§Ù</Label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px]"
                  onClick={addItemToOrder}
                >
                  <Plus className="w-3 h-3" />
                  Ø¥Ø¶Ø§ÙØ© ØµÙ†Ù
                </Button>
              </div>
              {orderItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input
                    value={item.productName}
                    readOnly
                    className="h-7 text-[10px] flex-1"
                  />
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={e => {
                      const newItems = [...orderItems];
                      newItems[idx].quantity = parseInt(e.target.value) || 1;
                      setOrderItems(newItems);
                    }}
                    className="h-7 text-[10px] w-16"
                  />
                  <Input
                    type="number"
                    value={item.unitPrice}
                    onChange={e => {
                      const newItems = [...orderItems];
                      newItems[idx].unitPrice = e.target.value;
                      setOrderItems(newItems);
                    }}
                    className="h-7 text-[10px] w-20"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() =>
                      setOrderItems(orderItems.filter((_, i) => i !== idx))
                    }
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-end pt-2 border-t">
                <p className="text-sm font-bold text-ink">
                  Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ: {fmtNum(orderTotal)} Ø±.ÙŠ
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOrderDialog(false)}
              className="h-8 text-xs"
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              size="sm"
              className="bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep h-8 text-xs"
              onClick={() =>
                createOrder.mutate({
                  customerId: orderCustomerId,
                  items: orderItems,
                  deliveryAddress: orderAddress,
                })
              }
              disabled={orderItems.length === 0 || isCreatingOrder}
            >
              {isCreatingOrder
                ? "Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ù†Ø´Ø§Ø¡..."
                : "Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„Ø·Ù„Ø¨"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog (Receipt / Settlement) */}
      <Dialog open={!!payTarget} onOpenChange={o => !o && setPayTarget(null)}>
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Wallet className="w-4 h-4 text-brand" /> ØªØ³Ø¬ÙŠÙ„ Ø¯ÙØ¹Ø© /
              Ø³Ù†Ø¯ Ù‚Ø¨Ø¶
            </DialogTitle>
          </DialogHeader>
          {payTarget && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg bg-muted border border-border p-2.5 text-xs space-y-1">
                <p className="font-bold text-foreground">
                  {payTarget.invoice.invoiceNumber} Â·{" "}
                  {payTarget.invoice.currency ||
                    (currenciesQ.data || []).find(
                      (currency: any) =>
                        currency.id === payTarget.invoice.currencyId
                    )?.code ||
                    "YER"}
                </p>
                <p className="text-muted-foreground">
                  Ø¥Ø¬Ù…Ø§Ù„ÙŠ Ø§Ù„ÙØ§ØªÙˆØ±Ø©:{" "}
                  <b>
                    {Number(payTarget.invoice.total).toLocaleString("en-US")}
                  </b>{" "}
                  Â· Ø§Ù„Ù…Ø¯ÙÙˆØ¹:{" "}
                  <b>
                    {Number(payTarget.invoice.paidAmount || 0).toLocaleString(
                      "en-US"
                    )}
                  </b>
                </p>
                <p className="text-success font-bold">
                  Ø§Ù„Ù…ØªØ¨Ù‚ÙŠ:{" "}
                  {Math.max(
                    0,
                    Number(payTarget.invoice.total) -
                      Number(payTarget.invoice.paidAmount || 0)
                  ).toLocaleString("en-US")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">
                    Ù…Ø¨Ù„Øº Ø§Ù„Ø¯ÙØ¹Ø©
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs font-mono bg-muted"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">
                    Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹
                  </Label>
                  <Select
                    value={payMethod}
                    onValueChange={v => setPayMethod(v as any)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-muted">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash" className="text-xs">
                        Ù†Ù‚Ø¯ÙŠ
                      </SelectItem>
                      <SelectItem value="transfer" className="text-xs">
                        ØªØ­ÙˆÙŠÙ„ Ø¨Ù†ÙƒÙŠ
                      </SelectItem>
                      <SelectItem value="card" className="text-xs">
                        Ø¨Ø·Ø§Ù‚Ø©
                      </SelectItem>
                      <SelectItem value="online" className="text-xs">
                        Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">
                  ØªØ§Ø±ÙŠØ® Ø§Ù„Ø¯ÙØ¹Ø© (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)
                </Label>
                <Input
                  type="date"
                  value={payDate}
                  onChange={e => setPayDate(e.target.value)}
                  className="h-8 text-xs bg-muted"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Ù…Ù„Ø§Ø­Ø¸Ø§Øª (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)
                </Label>
                <Input
                  value={payNotes}
                  onChange={e => setPayNotes(e.target.value)}
                  placeholder="Ù…Ø«Ø§Ù„: Ø¯ÙØ¹Ø© Ø£ÙˆÙ„Ù‰..."
                  className="h-8 text-xs bg-muted"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 pt-2">
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={printAfterSave}
                onChange={e => setPrintAfterSave(e.target.checked)}
                className="accent-brand"
              />
              Ø§Ø·Ø¨Ø¹ Ø³Ù†Ø¯{" "}
              {payTarget?.source === "purchases" ? "ØµØ±Ù" : "Ù‚Ø¨Ø¶"} Ø¨Ø¹Ø¯
              Ø§Ù„Ø­ÙØ¸
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPayTarget(null)}
              className="text-xs h-8"
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              size="sm"
              onClick={handlePay}
              disabled={createPayment.isPending}
              className="text-xs h-8 bg-success hover:bg-emerald-700 text-white font-bold"
            >
              {createPayment.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <Wallet className="w-3 h-3 ml-1" />
              )}
              ØªØ³Ø¬ÙŠÙ„ Ø§Ù„Ø¯ÙØ¹Ø©
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog
        open={!!editProduct}
        onOpenChange={o => !o && setEditProduct(null)}
      >
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Edit className="w-4 h-4 text-brand" /> ØªØ¹Ø¯ÙŠÙ„ Ù…Ù†ØªØ¬:{" "}
              {editProduct?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold text-foreground">
                Ø§Ø³Ù… Ø§Ù„Ù…Ù†ØªØ¬
              </Label>
              <Input
                value={editProductForm.name}
                onChange={e =>
                  setEditProductForm({
                    ...editProductForm,
                    name: e.target.value,
                  })
                }
                className="h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Ø³Ø¹Ø± Ø§Ù„Ø¨ÙŠØ¹
                </Label>
                <Input
                  value={editProductForm.salePrice}
                  onChange={e =>
                    setEditProductForm({
                      ...editProductForm,
                      salePrice: e.target.value,
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Ø³Ø¹Ø± Ø§Ù„Ø´Ø±Ø§Ø¡
                </Label>
                <Input
                  value={editProductForm.purchasePrice}
                  onChange={e =>
                    setEditProductForm({
                      ...editProductForm,
                      purchasePrice: e.target.value,
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Ø­Ø¯ Ø§Ù„Ø¥Ù†Ø°Ø§Ø± (minStock)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={editProductForm.minStock}
                  onChange={e =>
                    setEditProductForm({
                      ...editProductForm,
                      minStock: Number(e.target.value),
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Ø§Ù„Ø¨Ø§Ø±ÙƒÙˆØ¯
                </Label>
                <BarcodeScanner
                  value={editProductForm.barcode}
                  onChange={v =>
                    setEditProductForm({ ...editProductForm, barcode: v })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Ù†ÙˆØ¹ Ø§Ù„ØµÙ†Ù</Label>
                  <select
                    className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                    value={editProductForm.productType}
                    onChange={e =>
                      setEditProductForm({
                        ...editProductForm,
                        productType: e.target.value,
                      })
                    }
                  >
                    <option value="goods">Ø³Ù„Ø¹Ø©</option>
                    <option value="service">Ø®Ø¯Ù…Ø©</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px]">ÙˆØ­Ø¯Ø© Ø§Ù„Ù‚ÙŠØ§Ø³</Label>
                  <Input
                    value={editProductForm.unitOfMeasure}
                    onChange={e =>
                      setEditProductForm({
                        ...editProductForm,
                        unitOfMeasure: e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">ÙˆØ­Ø¯Ø© ÙØ±Ø¹ÙŠØ©</Label>
                  <Input
                    value={editProductForm.secondaryUnit}
                    onChange={e =>
                      setEditProductForm({
                        ...editProductForm,
                        secondaryUnit: e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">
                    Ù…Ø¹Ø§Ù…Ù„ Ø§Ù„ØªØ­ÙˆÙŠÙ„
                  </Label>
                  <Input
                    type="number"
                    value={editProductForm.conversionFactor}
                    onChange={e =>
                      setEditProductForm({
                        ...editProductForm,
                        conversionFactor: e.target.value,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-1 text-[10px]">
                    <input
                      type="checkbox"
                      checked={editProductForm.isComposite}
                      onChange={e =>
                        setEditProductForm({
                          ...editProductForm,
                          isComposite: e.target.checked,
                        })
                      }
                    />{" "}
                    Ù…Ø±ÙƒØ¨
                  </label>
                </div>
              </div>

              {editProductForm.productType === "service" && (
                <div className="border rounded-lg p-2 space-y-2 bg-warning/10/50">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">
                        Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„ØªÙƒÙ„ÙØ©
                      </Label>
                      <select
                        className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                        value={editProductForm.costMethod}
                        onChange={e =>
                          setEditProductForm({
                            ...editProductForm,
                            costMethod: e.target.value,
                          })
                        }
                      >
                        <option value="fixed">Ø«Ø§Ø¨ØªØ©</option>
                        <option value="calculated">Ù…Ø­Ø³ÙˆØ¨Ø©</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[10px]">
                        ØªÙƒÙ„ÙØ© Ù…Ø¨Ø§Ø´Ø±Ø©
                      </Label>
                      <Input
                        type="number"
                        value={editProductForm.directCost}
                        onChange={e =>
                          setEditProductForm({
                            ...editProductForm,
                            directCost: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">
                        ØºÙŠØ± Ù…Ø¨Ø§Ø´Ø±Ø©
                      </Label>
                      <Input
                        type="number"
                        value={editProductForm.indirectCost}
                        onChange={e =>
                          setEditProductForm({
                            ...editProductForm,
                            indirectCost: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-[10px]">
                        Ø¯Ù‚Ø§Ø¦Ù‚ Ø¥Ù†ØªØ§Ø¬
                      </Label>
                      <Input
                        type="number"
                        value={editProductForm.productionMinutes}
                        onChange={e =>
                          setEditProductForm({
                            ...editProductForm,
                            productionMinutes: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">ÙˆØ¶Ø¹ Ø§Ù„Ø³Ø¹Ø±</Label>
                      <select
                        className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
                        value={editProductForm.priceMode}
                        onChange={e =>
                          setEditProductForm({
                            ...editProductForm,
                            priceMode: e.target.value,
                          })
                        }
                      >
                        <option value="margin">Ù‡Ø§Ù…Ø´</option>
                        <option value="direct">Ù…Ø¨Ø§Ø´Ø±</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-[10px]">Ù‡Ø§Ù…Ø´ %</Label>
                      <Input
                        type="number"
                        value={editProductForm.marginPct}
                        onChange={e =>
                          setEditProductForm({
                            ...editProductForm,
                            marginPct: e.target.value,
                          })
                        }
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-[10px]">Ø­Ø³Ø§Ø¨ Ø§Ù„Ø¥ÙŠØ±Ø§Ø¯</Label>
                  <AcctSelect
                    value={editProductForm.salesAccountId}
                    onChange={v =>
                      setEditProductForm({
                        ...editProductForm,
                        salesAccountId: v,
                      })
                    }
                    accounts={accountsQuery.data}
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Ø­Ø³Ø§Ø¨ Ø§Ù„ØªÙƒÙ„ÙØ©</Label>
                  <AcctSelect
                    value={editProductForm.cogsAccountId}
                    onChange={v =>
                      setEditProductForm({
                        ...editProductForm,
                        cogsAccountId: v,
                      })
                    }
                    accounts={accountsQuery.data}
                  />
                </div>
                <div>
                  <Label className="text-[10px]">
                    Ø­Ø³Ø§Ø¨ Ø§Ù„Ù…Ø®Ø²ÙˆÙ†
                  </Label>
                  <AcctSelect
                    value={editProductForm.inventoryAccountId}
                    onChange={v =>
                      setEditProductForm({
                        ...editProductForm,
                        inventoryAccountId: v,
                      })
                    }
                    accounts={accountsQuery.data}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditProduct(null)}
              className="text-xs h-8"
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              size="sm"
              onClick={() =>
                updateProduct.mutate({
                  id: editProductForm.id,
                  name: editProductForm.name,
                  salePrice: editProductForm.salePrice,
                  purchasePrice: editProductForm.purchasePrice,
                  minStock: editProductForm.minStock,
                  barcode: editProductForm.barcode || undefined,
                  productType: editProductForm.productType,
                  unitOfMeasure: editProductForm.unitOfMeasure || undefined,
                  secondaryUnit: editProductForm.secondaryUnit || undefined,
                  conversionFactor:
                    Number(editProductForm.conversionFactor) || 1,
                  isComposite: editProductForm.isComposite,
                  bom: editProductForm.bom,
                  alternativeIds: editProductForm.alternativeIds,
                  attachmentUrl: editProductForm.attachmentUrl || undefined,
                  costMethod: editProductForm.costMethod,
                  directCost: Number(editProductForm.directCost) || 0,
                  indirectCost: Number(editProductForm.indirectCost) || 0,
                  productionMinutes:
                    Number(editProductForm.productionMinutes) || 0,
                  priceMode: editProductForm.priceMode,
                  marginPct: Number(editProductForm.marginPct) || 0,
                  salesAccountId: editProductForm.salesAccountId || undefined,
                  cogsAccountId: editProductForm.cogsAccountId || undefined,
                  inventoryAccountId:
                    editProductForm.inventoryAccountId || undefined,
                } as any)
              }
              disabled={updateProduct.isPending}
              className="text-xs h-8 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold"
            >
              {updateProduct.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <CheckCircle className="w-3 h-3 ml-1" />
              )}
              Ø­ÙØ¸ Ø§Ù„ØªØ¹Ø¯ÙŠÙ„Ø§Øª
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjust Stock Dialog */}
      <Dialog
        open={!!adjustProduct}
        onOpenChange={o => !o && setAdjustProduct(null)}
      >
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <PackagePlus className="w-4 h-4 text-brand" /> ØªØ¹Ø¯ÙŠÙ„
              Ø§Ù„Ù…Ø®Ø²ÙˆÙ†: {adjustProduct?.name}
            </DialogTitle>
          </DialogHeader>
          {adjustProduct && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg bg-muted border border-border p-2.5 text-xs">
                <p className="text-muted-foreground">
                  Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ø§Ù„Ø­Ø§Ù„ÙŠ:{" "}
                  <b
                    className={
                      adjustProduct.currentStock <= adjustProduct.minStock
                        ? "text-red-600"
                        : "text-foreground"
                    }
                  >
                    {adjustProduct.currentStock}
                  </b>{" "}
                  {adjustProduct.unit}
                </p>
                <p className="text-muted-foreground text-[10px]">
                  Ø­Ø¯ Ø§Ù„Ø¥Ù†Ø°Ø§Ø±: {adjustProduct.minStock}{" "}
                  {adjustProduct.unit}
                </p>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Ù†ÙˆØ¹ Ø§Ù„Ø¹Ù…Ù„ÙŠØ©
                </Label>
                <Select
                  value={adjustForm.type}
                  onValueChange={v =>
                    setAdjustForm({ ...adjustForm, type: v as any })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in" className="text-xs">
                      ØªØ²ÙˆÙŠØ¯ Ø§Ù„Ù…Ø®Ø²ÙˆÙ† (+)
                    </SelectItem>
                    <SelectItem value="out" className="text-xs">
                      ØµØ±Ù Ù…Ù† Ø§Ù„Ù…Ø®Ø²ÙˆÙ† (âˆ’)
                    </SelectItem>
                    <SelectItem value="adjustment" className="text-xs">
                      ØªØ³ÙˆÙŠØ© / Ø¬Ø±Ø¯
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Ø§Ù„ÙƒÙ…ÙŠØ©
                </Label>
                <Input
                  type="number"
                  min="1"
                  value={adjustForm.quantity}
                  onChange={e =>
                    setAdjustForm({
                      ...adjustForm,
                      quantity: Math.max(1, Number(e.target.value)),
                    })
                  }
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-foreground">
                  Ø³Ø¨Ø¨ Ø§Ù„Ø¹Ù…Ù„ÙŠØ© (Ø§Ø®ØªÙŠØ§Ø±ÙŠ)
                </Label>
                <Input
                  value={adjustForm.notes}
                  onChange={e =>
                    setAdjustForm({ ...adjustForm, notes: e.target.value })
                  }
                  placeholder="Ù…Ø«Ø§Ù„: Ø¬Ø±Ø¯ Ø´Ù‡Ø±ÙŠØŒ ØªØ§Ù„Ù..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdjustProduct(null)}
              className="text-xs h-8"
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              size="sm"
              onClick={() =>
                adjustStock.mutate({
                  productId: adjustProduct.id,
                  quantity: adjustForm.quantity,
                  type: adjustForm.type,
                  notes: adjustForm.notes || undefined,
                })
              }
              disabled={adjustStock.isPending}
              className="text-xs h-8 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold"
            >
              {adjustStock.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <CheckCircle className="w-3 h-3 ml-1" />
              )}
              ØªÙ†ÙÙŠØ° Ø§Ù„Ø¹Ù…Ù„ÙŠØ©
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Order to Invoice Dialog */}
      <Dialog
        open={!!convertOrder}
        onOpenChange={o => !o && setConvertOrder(null)}
      >
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-brand" /> ØªØ­ÙˆÙŠÙ„
              Ø§Ù„Ø·Ù„Ø¨ Ø¥Ù„Ù‰ ÙØ§ØªÙˆØ±Ø© Ù…Ø¨ÙŠØ¹Ø§Øª
            </DialogTitle>
          </DialogHeader>
          {convertOrder && (
            <div className="space-y-3 pt-2">
              <div className="rounded-lg bg-muted border border-border p-2.5 text-xs space-y-1">
                <p className="font-bold text-foreground flex items-center gap-2">
                  {convertOrder.orderNumber}
                  {isWebOrder(convertOrder) && (
                    <Badge className="text-[9px] bg-purple-100 text-purple-700">
                      Ù…ØªØ¬Ø± Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ
                    </Badge>
                  )}
                </p>
                <p className="text-muted-foreground">
                  Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ:{" "}
                  <b className="text-foreground font-mono">
                    {Number(convertOrder.total).toLocaleString("en-US")} Ø±.ÙŠ
                  </b>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Ø§Ù„Ù…Ø®Ø²ÙˆÙ† Ù…Ø­Ø¬ÙˆØ² Ù…Ù†Ø° ÙˆÙ‚Øª Ø§Ù„Ø·Ù„Ø¨ â€” Ù„Ù†
                  ÙŠÙØ®ØµÙ… Ù…Ø±Ø© Ø£Ø®Ø±Ù‰ Ø¹Ù†Ø¯ Ø¥Ù†Ø´Ø§Ø¡
                  Ø§Ù„ÙØ§ØªÙˆØ±Ø©
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">
                    Ø·Ø±ÙŠÙ‚Ø© Ø§Ù„Ø¯ÙØ¹
                  </Label>
                  <Select
                    value={convertForm.paymentMethod}
                    onValueChange={v =>
                      setConvertForm({ ...convertForm, paymentMethod: v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs bg-muted">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash" className="text-xs">
                        Ù†Ù‚Ø¯ÙŠ Ø¹Ù†Ø¯ Ø§Ù„ØªÙˆØµÙŠÙ„
                      </SelectItem>
                      <SelectItem value="card" className="text-xs">
                        Ø¨Ø·Ø§Ù‚Ø©
                      </SelectItem>
                      <SelectItem value="transfer" className="text-xs">
                        ØªØ­ÙˆÙŠÙ„ Ø¨Ù†ÙƒÙŠ
                      </SelectItem>
                      <SelectItem value="online" className="text-xs">
                        Ø¥Ù„ÙƒØªØ±ÙˆÙ†ÙŠ
                      </SelectItem>
                      <SelectItem value="credit" className="text-xs">
                        Ø¢Ø¬Ù„ (Ø£Ø¬Ù„)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-bold text-foreground">
                    Ø§Ù„Ù…Ø¨Ù„Øº Ø§Ù„Ù…Ø¯ÙÙˆØ¹ Ø§Ù„Ø¢Ù†
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max={Number(convertOrder.total)}
                    value={convertForm.paidAmount}
                    onChange={e =>
                      setConvertForm({
                        ...convertForm,
                        paidAmount: e.target.value,
                      })
                    }
                    className="h-8 text-xs font-mono bg-muted"
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Ø§Ù„Ù…Ø¯ÙÙˆØ¹ = Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ â†’ ÙØ§ØªÙˆØ±Ø©
                Â«Ù…Ø¯ÙÙˆØ¹Ø©Â» â€¢ Ø£Ù‚Ù„ Ù…Ù† Ø§Ù„Ø¥Ø¬Ù…Ø§Ù„ÙŠ â†’
                Â«Ù…Ø¯ÙÙˆØ¹Ø© Ø¬Ø²Ø¦ÙŠØ§Ù‹Â» ÙˆØ§Ù„Ø±ØµÙŠØ¯ ÙŠØªØ±Ø§ÙƒÙ… Ø¹Ù„Ù‰
                Ø§Ù„Ø¹Ù…ÙŠÙ„ â€¢ ØµÙØ± â†’ Â«Ù…Ø¤ÙƒØ¯Ø©Â» (Ø¢Ø¬Ù„)
              </p>
            </div>
          )}
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConvertOrder(null)}
              className="text-xs h-8"
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              size="sm"
              disabled={convertToInvoice.isPending}
              onClick={() =>
                convertToInvoice.mutate({
                  orderId: convertOrder.id,
                  paymentMethod: convertForm.paymentMethod as any,
                  paidAmount: convertForm.paidAmount || "0",
                })
              }
              className="text-xs h-8 bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold"
            >
              {convertToInvoice.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin ml-1" />
              ) : (
                <ReceiptText className="w-3 h-3 ml-1" />
              )}
              Ø¥Ù†Ø´Ø§Ø¡ Ø§Ù„ÙØ§ØªÙˆØ±Ø© ÙˆØ§Ù„Ù‚ÙŠÙˆØ¯
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog
        open={showImportDialog}
        onOpenChange={o => {
          setShowImportDialog(o);
          if (!o) {
            setImportRows(null);
            setImportFileName("");
          }
        }}
      >
        <DialogContent className="max-w-md font-sans" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Upload className="w-4 h-4 text-brand" /> Ø§Ø³ØªÙŠØ±Ø§Ø¯
              Ø§Ù„Ø£ØµÙ†Ø§Ù ÙˆØ§Ù„Ø®Ø¯Ù…Ø§Øª (CSV)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ø§Ù„Ø£Ø¹Ù…Ø¯Ø©:{" "}
              <code
                className="text-[10px] bg-muted px-1.5 py-0.5 rounded"
                dir="ltr"
              >
                code,name,type,category,unit,purchasePrice,salePrice,wholesalePrice,minStock,currentStock,barcode
              </code>
              <br />
              ØªÙÙ‚Ø¨Ù„ Ø£ÙŠØ¶Ø§Ù‹ Ø±Ø¤ÙˆØ³ Ø¹Ø±Ø¨ÙŠØ© (Ø§Ù„Ø±Ù…Ø²ØŒ
              Ø§Ù„Ø§Ø³Ù…ØŒ Ø§Ù„Ù†ÙˆØ¹: ØµÙ†Ù/Ø®Ø¯Ù…Ø©...). Ø§Ù„Ø£ØµÙ†Ø§Ù
              Ø§Ù„Ù…ÙˆØ¬ÙˆØ¯Ø© ØªÙØ­Ø¯ÙŽÙ‘Ø«ØŒ ÙˆØ§Ù„Ø¬Ø¯ÙŠØ¯Ø© ØªÙØ¶Ø§ÙØŒ
              ÙˆØ§Ù„Ù…Ø®Ø²ÙˆÙ† ÙŠØ¹Ø¯ÙŽÙ‘Ù„ Ø¨ÙØ§Ø±Ù‚ Ø§Ù„Ø±ØµÙŠØ¯ Ù…Ø¹
              ØªØ³Ø¬ÙŠÙ„ Ø­Ø±ÙƒØ© Ø¬Ø±Ø¯.
            </p>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-brand-200 rounded-lg p-5 cursor-pointer bg-brand-50 hover:bg-muted transition-colors">
              <Upload className="w-5 h-5 text-brand" />
              <span className="text-xs font-bold text-brand-800">
                {importFileName || "Ø§Ø®ØªØ± Ù…Ù„Ù CSV"}
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={e => onImportFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={downloadProductTemplate}
            >
              <Download className="w-3 h-3 ml-1" /> ØªÙ†Ø²ÙŠÙ„ Ù†Ù…ÙˆØ°Ø¬
              Ø¬Ø§Ù‡Ø² (Template)
            </Button>
            {importRows && (
              <div className="rounded-lg bg-muted border border-border p-2.5 text-xs space-y-1">
                <p className="font-bold text-foreground">
                  Ø¬Ø§Ù‡Ø² Ù„Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯: {importRows.length} ØµÙØ§Ù‹
                </p>
                <p className="text-muted-foreground text-[10px]">
                  Ø³ÙŠØªÙ… Ø§Ù„ØªØ­Ø¯ÙŠØ« Ø­Ø³Ø¨ Ø§Ù„Ø±Ù…Ø² (code) â€”
                  Ø§Ù„Ø£Ø³Ø¹Ø§Ø± ÙˆØ§Ù„Ø±ØµÙŠØ¯ ÙˆØ­Ø¯ Ø§Ù„Ø¥Ù†Ø°Ø§Ø±
                  Ø³ØªÙØ­Ø¯ÙŽÙ‘Ø« Ù„Ù„Ù‚Ø§Ø¦Ù… Ù…Ù†Ù‡Ø§
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowImportDialog(false)}
              className="text-xs h-8"
            >
              Ø¥Ù„ØºØ§Ø¡
            </Button>
            <Button
              size="sm"
              className="text-xs h-8 bg-brand text-white"
              disabled={
                !importRows ||
                importRows.length === 0 ||
                importProductsCsv.isPending
              }
              onClick={handleImportProducts}
            >
              <Upload className="w-3 h-3 ml-1" />
              {importProductsCsv.isPending
                ? "Ø¬Ø§Ø±Ù Ø§Ù„Ø§Ø³ØªÙŠØ±Ø§Ø¯..."
                : "Ø§Ø³ØªÙŠØ±Ø§Ø¯ Ø§Ù„Ø¢Ù†"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AcctSelect({
  value,
  onChange,
  accounts,
}: {
  value?: number;
  onChange: (v?: number) => void;
  accounts?: { id: number; code: string; name: string }[];
}) {
  return (
    <select
      className="w-full h-8 rounded-lg border border-gray-300 px-2 text-xs bg-card"
      value={value ?? ""}
      onChange={e =>
        onChange(e.target.value ? Number(e.target.value) : undefined)
      }
    >
      <option value="">Ø§ÙØªØ±Ø§Ø¶ÙŠ</option>
      {(accounts || []).map(a => (
        <option key={a.id} value={a.id}>
          {a.code} - {a.name}
        </option>
      ))}
    </select>
  );
}
