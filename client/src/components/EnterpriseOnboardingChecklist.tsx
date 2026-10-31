import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { DataImportExportCenter } from "@/components/DataImportExportCenter";

interface ChecklistItem {
  id: string;
  title: string;
  desc: string;
  done: boolean;
  actionLabel: string;
  actionPath: string;
}

export function EnterpriseOnboardingChecklist() {
  const [, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [completedItems, setCompletedItems] = useState<Record<string, boolean>>(
    {
      org_created: true,
      coa_seeded: true,
      invoice_setup: false,
      first_item: false,
      first_invoice: false,
    }
  );

  // Load persistence from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("uamex_onboarding_checklist");
      if (saved) {
        setCompletedItems(prev => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      /* ignore localStorage errors */
    }
  }, []);

  const toggleItem = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCompletedItems(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(
          "uamex_onboarding_checklist",
          JSON.stringify(next)
        );
      } catch {
        /* ignore localStorage errors */
      }
      return next;
    });
  };

  const checklist: ChecklistItem[] = [
    {
      id: "org_created",
      title: "إنشاء المنشأة والفرع الرئيسي وضبط العملة",
      desc: "تمت تهيئة الكيان القانوني ومخزن البداية والعملة الأساسية آلياً.",
      done: completedItems.org_created ?? true,
      actionLabel: "مراجعة الإعدادات",
      actionPath: "/settings",
    },
    {
      id: "coa_seeded",
      title: "توليد دليل الحسابات المتوافق مع قطاعك",
      desc: "تم بناء شجرة الحسابات الشجرية والقيد المزدوج وفق المعايير المحاسبية.",
      done: completedItems.coa_seeded ?? true,
      actionLabel: "عرض الدليل المحاسبي",
      actionPath: "/accounting",
    },
    {
      id: "invoice_setup",
      title: "تخصيص شعار وبيانات الفاتورة والضريبة",
      desc: "أضف شعار منشأتك، الرقم الضريبي، وترويسة الفواتير المطبوعة والإلكترونية.",
      done: completedItems.invoice_setup ?? false,
      actionLabel: "تخصيص الفاتورة",
      actionPath: "/settings",
    },
    {
      id: "first_item",
      title: "إضافة أول صنف تجاري أو خدمة مهنية",
      desc: "عرّف منتجاتك أو خدماتك الاستشارية وأسعار البيع والتكلفة.",
      done: completedItems.first_item ?? false,
      actionLabel: "إضافة صنف/خدمة",
      actionPath: "/commercial",
    },
    {
      id: "first_invoice",
      title: "إصدار أول فاتورة مبيعات أو قيد افتتاحي",
      desc: "جرّب دورة البيع وإصدار الفاتورة أو تسجيل أرصدة أول المدة.",
      done: completedItems.first_invoice ?? false,
      actionLabel: "إصدار فاتورة",
      actionPath: "/commercial",
    },
  ];

  const total = checklist.length;
  const doneCount = checklist.filter(c => c.done).length;
  const progressPercent = Math.round((doneCount / total) * 100);

  if (progressPercent === 100 && isCollapsed) {
    return null; // hide cleanly when 100% complete and collapsed
  }

  return (
    <Card className="rounded-3xl border-2 border-brand/25 bg-card text-card-foreground p-5 sm:p-6 shadow-md transition-all">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-foreground">
                جاهزية المنشأة والانطلاق السريع (Onboarding Cockpit)
              </h3>
              <Badge className="bg-brand/15 text-brand border-brand/30 text-[10px] font-black">
                {progressPercent}% مكتمل
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              خطوات الإعداد المؤسسي المتكامل للوصول لمنظومة تشغيلية مكتملة 100%
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DataImportExportCenter />
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition-colors"
            title={isCollapsed ? "توسيع" : "طي"}
          >
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-muted rounded-full h-2 mt-4 overflow-hidden relative">
        <div
          className="bg-gradient-to-r from-brand to-emerald-500 h-full rounded-full transition-all duration-500"
          style={{ width: progressPercent + "%" }}
        />
      </div>

      {/* Checklist items */}
      {!isCollapsed && (
        <div className="space-y-2.5 pt-4">
          {checklist.map(item => (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={
                "flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer gap-2 " +
                (item.done
                  ? "bg-muted/30 border-border opacity-85"
                  : "bg-background border-brand/30 hover:border-brand shadow-sm")
              }
            >
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={e => toggleItem(item.id, e)}
                  className="mt-0.5 shrink-0 text-brand"
                >
                  {item.done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/20" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground/60" />
                  )}
                </button>
                <div>
                  <div
                    className={
                      "text-xs font-bold " +
                      (item.done
                        ? "line-through text-muted-foreground"
                        : "text-foreground")
                    }
                  >
                    {item.title}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {item.desc}
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant={item.done ? "outline" : "default"}
                onClick={e => {
                  e.stopPropagation();
                  setLocation(item.actionPath);
                }}
                className={
                  "h-8 text-xs font-bold rounded-xl gap-1 shrink-0 " +
                  (item.done
                    ? "border-border text-muted-foreground hover:text-foreground"
                    : "bg-brand hover:bg-brand-deep hover:text-sand text-ink-deep shadow-sm")
                }
              >
                <span>{item.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
