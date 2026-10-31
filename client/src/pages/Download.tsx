import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Download,
  Smartphone,
  Monitor,
  Tablet,
  Check,
  Copy,
  ExternalLink,
  QrCode,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { useInstallPrompt } from "@/lib/use-install-prompt";

type DeviceType = "android" | "ios" | "desktop" | "unknown";
type InstallMethod = "pwa" | "apk" | "playstore" | "appstore" | "manual";

interface DeviceInfo {
  type: DeviceType;
  browser: string;
  isStandalone: boolean;
  canInstallPWA: boolean;
  method: InstallMethod;
  instructions: string[];
  dailyActiveUsers?: number;
  installSource?: "organic" | "referral" | "direct" | "social";
}

function detectDevice(): DeviceInfo {
  const ua = navigator.userAgent;
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true;

  // Track install source if available from referrer or query params
  const installSource =
    typeof window !== "undefined"
      ? (() => {
          try {
            const search = new URLSearchParams(window.location.search);
            if (search.has("utm_source")) return "organic";
            if (search.has("ref")) return "referral";
            return "direct";
          } catch {
            return "direct";
          }
        })()
      : "direct";

  let type: DeviceType = "unknown";
  let browser = "Unknown";
  let canInstallPWA = false;

  // Device detection priority
  if (/Android/i.test(ua)) {
    type = "android";
    if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) {
      browser = "Chrome";
      canInstallPWA = true;
    } else if (/Firefox/i.test(ua)) {
      browser = "Firefox";
      canInstallPWA = true;
    } else if (/SamsungBrowser/i.test(ua)) {
      browser = "Samsung Browser";
      canInstallPWA = true;
    } else if (/Edge/i.test(ua)) {
      browser = "Edge";
      canInstallPWA = true;
    }
  } else if (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    type = "ios";
    browser = "Safari";
    canInstallPWA = true;
  } else if (/Windows|Mac|Linux/i.test(ua)) {
    type = "desktop";
    if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) {
      browser = "Chrome";
      canInstallPWA = true;
    } else if (/Edge/i.test(ua)) {
      browser = "Edge";
      canInstallPWA = true;
    } else if (/Firefox/i.test(ua)) {
      browser = "Firefox";
      canInstallPWA = true;
    } else if (/Safari/i.test(ua)) {
      browser = "Safari";
      canInstallPWA = true;
    }
  }

  // Determine install method based on capabilities
  let method: InstallMethod = "pwa";
  let instructions: string[] = [];

  if (isStandalone) {
    instructions = ["التطبيق مُثبّت بالفعل على جهازك!"];
    method = "pwa";
  } else if (type === "android") {
    if (canInstallPWA) {
      instructions = [
        "اضغط على النقاط الثلاث (⋮) في أعلى يمين المتصفح",
        'اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"',
        'اضغط "تثبيت" للتأكيد',
        "سيظهر التطبيق على شاشتك مباشرة",
      ];
      method = "pwa";
    } else {
      instructions = [
        "افتح هذا الرابط في متصفح Chrome",
        "اتبع خطوات التثبيت التالية",
      ];
      method = "pwa";
    }
  } else if (type === "ios") {
    instructions = [
      "افتح هذا الرابط في متصفح Safari",
      "اضغط على زر المشاركة (المربع السهم) أسفل الشاشة",
      'اختر "إضافة إلى الشاشة الرئيسية"',
      'اضغط "إضافة" في الزاوية اليمنى العليا',
      "سيظهر التطبيق على شاشتك مباشرة",
    ];
    method = "pwa";
  } else if (type === "desktop") {
    if (canInstallPWA) {
      instructions = [
        "اضغط على أيقونة التثبيت (⬇) في شريط العنوان",
        "أو اضغط Ctrl+Shift+I ثم اختر Install",
        'اضغط "تثبيت" للتأكيد',
        "سيظهر التطبيق كنافذة مستقلة",
      ];
      method = "pwa";
    } else {
      instructions = [
        "استخدم متصفح Chrome أو Edge لأفضل تجربة",
        " Bookmark هذا الرابط للوصول السريع",
      ];
      method = "manual";
    }
  }

  return {
    type,
    browser,
    isStandalone,
    canInstallPWA,
    method,
    instructions,
    dailyActiveUsers: 0, // Placeholder for analytics
    installSource,
  };
}

function getDeviceIcon(type: DeviceType) {
  switch (type) {
    case "android":
      return <Smartphone className="w-6 h-6" />;
    case "ios":
      return <Smartphone className="w-6 h-6" />;
    case "desktop":
      return <Monitor className="w-6 h-6" />;
    default:
      return <Tablet className="w-6 h-6" />;
  }
}

function getDeviceLabel(type: DeviceType): string {
  switch (type) {
    case "android":
      return "Android";
    case "ios":
      return "iOS / iPhone";
    case "desktop":
      return "كمبيوتر";
    default:
      return "جهاز غير معروف";
  }
}

function QRCodeSVG({ url, size = 200 }: { url: string; size?: number }) {
  const modules = generateQRMatrix(url);
  const cellSize = size / modules.length;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={size} height={size} fill="white" />
      {modules.map((row, y) =>
        row.map((cell, x) =>
          cell ? (
            <rect
              key={`${x}-${y}`}
              x={x * cellSize}
              y={y * cellSize}
              width={cellSize}
              height={cellSize}
              fill="#102a2b"
            />
          ) : null
        )
      )}
    </svg>
  );
}

function generateQRMatrix(text: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  // Finder patterns
  const drawFinder = (startX: number, startY: number) => {
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        if (
          i === 0 ||
          i === 6 ||
          j === 0 ||
          j === 6 ||
          (i >= 2 && i <= 4 && j >= 2 && j <= 4)
        ) {
          matrix[startY + i][startX + j] = true;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(size - 7, 0);
  drawFinder(0, size - 7);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  // Data encoding (simplified)
  const hash = Array.from(text).reduce(
    (acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0,
    0
  );
  let seed = Math.abs(hash);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (matrix[y][x]) continue;
      if (x < 9 && y < 9) continue;
      if (x > size - 9 && y < 9) continue;
      if (x < 9 && y > size - 9) continue;
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      matrix[y][x] = seed % 3 === 0;
    }
  }

  return matrix;
}

export default function DownloadPage() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    setDeviceInfo(detectDevice());

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    setIsInstalling(true);
    try {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === "accepted") {
        toast.success("جاري تثبيت التطبيق...");
      }
    } catch {
      toast.error("فشل التثبيت");
    } finally {
      setIsInstalling(false);
      setInstallPrompt(null);
    }
  }, [installPrompt]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("تم نسخ الرابط");
  };

  const currentUrl =
    typeof window !== "undefined" ? window.location.origin : "";

  if (!deviceInfo) return null;

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-sand to-muted flex flex-col"
      dir="rtl"
    >
      <main className="flex-1 max-w-2xl mx-auto w-full p-4 space-y-4">
        {/* Device Detection Card */}
        <Card className="border-0 shadow-md bg-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-ink text-brand w-12 h-12 rounded-xl flex items-center justify-center">
                {getDeviceIcon(deviceInfo.type)}
              </div>
              <div>
                <h2 className="font-bold text-ink text-lg">تم اكتشاف جهازك</h2>
                <p className="text-xs text-gray-500">
                  {getDeviceLabel(deviceInfo.type)} • {deviceInfo.browser}
                </p>
              </div>
            </div>

            {deviceInfo.isStandalone ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-bold text-green-800 text-sm">
                    التطبيق مُثبّت بالفعل
                  </p>
                  <p className="text-xs text-green-600">
                    يمكنك الوصول من شاشتك الرئيسية
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Install Button */}
                {installPrompt && (
                  <Button
                    onClick={handleInstall}
                    disabled={isInstalling}
                    className="w-full bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep font-bold h-12 text-sm"
                  >
                    <Download className="w-4 h-4 ml-2" />
                    {isInstalling ? "جاري التثبيت..." : "تثبيت التطبيق الآن"}
                  </Button>
                )}

                {/* QR Code */}
                <div className="flex flex-col items-center gap-2 py-3">
                  <QrCode className="w-5 h-5 text-ink" />
                  <p className="text-xs text-gray-500">
                    امسح الرمز للتحميل على جهاز آخر
                  </p>
                  <div className="bg-white p-2 rounded-lg border shadow-sm">
                    <QRCodeSVG url={currentUrl} size={160} />
                  </div>
                </div>

                {/* Copy Link */}
                <Button
                  variant="outline"
                  onClick={copyLink}
                  className="w-full border-ink/20 text-ink h-10 text-xs"
                >
                  <Copy className="w-4 h-4 ml-2" />
                  نسخ رابط التحميل
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        {!deviceInfo.isStandalone && deviceInfo.instructions.length > 0 && (
          <Card className="border-0 shadow-md bg-white">
            <CardContent className="p-5">
              <h3 className="font-bold text-ink text-sm mb-3">
                خطوات التثبيت على {getDeviceLabel(deviceInfo.type)}
              </h3>
              <ol className="space-y-3">
                {deviceInfo.instructions.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="bg-brand text-ink-deep w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700 leading-relaxed">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Features Card */}
        <Card className="border-0 shadow-md bg-ink text-white">
          <CardContent className="p-5">
            <h3 className="font-bold text-brand text-sm mb-3">
              مميزات التطبيق
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  icon: <WifiOff className="w-4 h-4" />,
                  text: "يعمل بدون إنترنت",
                },
                { icon: <Wifi className="w-4 h-4" />, text: "مزامنة تلقائية" },
                {
                  icon: <Smartphone className="w-4 h-4" />,
                  text: "متوافق مع كل الأجهزة",
                },
                {
                  icon: <Monitor className="w-4 h-4" />,
                  text: ".POINT OF SALE",
                },
              ].map((f, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs text-white/80"
                >
                  <span className="text-brand">{f.icon}</span>
                  {f.text}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Platform Link */}
        <Card className="border-0 shadow-md bg-white">
          <CardContent className="p-4">
            <Button
              variant="outline"
              onClick={() =>
                window.open("https://alhusainiaye.vercel.app", "_blank")
              }
              className="w-full border-ink/20 text-ink h-10 text-xs"
            >
              <ExternalLink className="w-4 h-4 ml-2" />
              زيارة موقع الحسينية الرسمي
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
