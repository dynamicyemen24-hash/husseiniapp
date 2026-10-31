export function formatCurrency(
  amount: number,
  currency: string = "YER",
  decimals: number = 0,
  locale: string = "ar-YE"
): string {
  if (!Number.isFinite(amount)) return "0";

  const currencySymbols: Record<string, string> = {
    YER: "ر.ي",
    SAR: "ر.س",
    USD: "$",
    EUR: "€",
    AED: "د.إ",
    KWD: "د.ك",
    QAR: "ر.ق",
    BHD: "د.ب",
    OMR: "ر.ع",
    EGP: "ج.م",
  };

  const currencyCodes: Record<string, string> = {
    YER: "YER",
    SAR: "SAR",
    USD: "USD",
    EUR: "EUR",
    AED: "AED",
    KWD: "KWD",
    QAR: "QAR",
    BHD: "BHD",
    OMR: "OMR",
    EGP: "EGP",
  };

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCodes[currency] || "YER",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    const symbol = currencySymbols[currency] || "ر.ي";
    const formatted = amount.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    return `${formatted} ${symbol}`;
  }
}

export function parseCurrency(value: string, currency: string = "YER"): number {
  const cleaned = value.replace(/[^\d.,-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}

export function calculateTax(amount: number, taxRate: number): number {
  return Math.round(amount * (taxRate / 100) * 100) / 100;
}

export function calculateDiscount(
  amount: number,
  discountPercent: number
): number {
  return Math.round(amount * (discountPercent / 100) * 100) / 100;
}

export function roundCurrency(
  amount: number,
  decimals: number = 2,
  method: "round" | "floor" | "ceil" = "round"
): number {
  const factor = Math.pow(10, decimals);
  switch (method) {
    case "floor":
      return Math.floor(amount * factor) / factor;
    case "ceil":
      return Math.ceil(amount * factor) / factor;
    default:
      return Math.round(amount * factor) / factor;
  }
}

export function formatNumber(
  value: number,
  decimals: number = 0,
  locale: string = "ar-YE"
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function calculateChange(paid: number, total: number): number {
  return Math.max(0, paid - total);
}

export function calculateDue(total: number, paid: number): number {
  return Math.max(0, total - paid);
}

export function isPaymentComplete(
  total: number,
  paid: number,
  tolerance: number = 0.01
): boolean {
  return Math.abs(total - paid) <= tolerance;
}

export function splitPayment(
  total: number,
  methods: Array<{ method: string; maxAmount?: number }>
): Array<{ method: string; amount: number }> {
  const result: Array<{ method: string; amount: number }> = [];
  let remaining = total;

  for (const method of methods) {
    if (remaining <= 0) break;
    const amount = method.maxAmount
      ? Math.min(remaining, method.maxAmount)
      : remaining;
    result.push({ method: method.method, amount });
    remaining -= amount;
  }

  return result;
}

export function convertCurrency(
  amount: number,
  fromRate: number,
  toRate: number
): number {
  if (fromRate === 0) return 0;
  return amount * (toRate / fromRate);
}

export function getCurrencyConfig(currency: string) {
  const configs: Record<
    string,
    {
      symbol: string;
      code: string;
      decimals: number;
      name: string;
      nameAr: string;
    }
  > = {
    YER: {
      symbol: "ر.ي",
      code: "YER",
      decimals: 0,
      name: "Yemeni Rial",
      nameAr: "ريال يمني",
    },
    SAR: {
      symbol: "ر.س",
      code: "SAR",
      decimals: 2,
      name: "Saudi Riyal",
      nameAr: "ريال سعودي",
    },
    USD: {
      symbol: "$",
      code: "USD",
      decimals: 2,
      name: "US Dollar",
      nameAr: "دولار أمريكي",
    },
    EUR: {
      symbol: "€",
      code: "EUR",
      decimals: 2,
      name: "Euro",
      nameAr: "يورو",
    },
    AED: {
      symbol: "د.إ",
      code: "AED",
      decimals: 2,
      name: "UAE Dirham",
      nameAr: "درهم إماراتي",
    },
    KWD: {
      symbol: "د.ك",
      code: "KWD",
      decimals: 3,
      name: "Kuwaiti Dinar",
      nameAr: "دينار كويتي",
    },
    QAR: {
      symbol: "ر.ق",
      code: "QAR",
      decimals: 2,
      name: "Qatari Riyal",
      nameAr: "ريال قطري",
    },
    BHD: {
      symbol: "د.ب",
      code: "BHD",
      decimals: 3,
      name: "Bahraini Dinar",
      nameAr: "دينار بحريني",
    },
    OMR: {
      symbol: "ر.ع",
      code: "OMR",
      decimals: 3,
      name: "Omani Rial",
      nameAr: "ريال عماني",
    },
    EGP: {
      symbol: "ج.م",
      code: "EGP",
      decimals: 2,
      name: "Egyptian Pound",
      nameAr: "جنيه مصري",
    },
  };
  return configs[currency] || configs.YER;
}
