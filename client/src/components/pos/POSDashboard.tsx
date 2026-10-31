import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataGrid } from "@/components/ui/data-grid";
import { Plus, ShoppingCart, Receipt, Settings } from "lucide-react";

interface POSProduct {
  id: number;
  name: string;
  price: number;
  stock: number;
  category: string;
}

const mockProducts: POSProduct[] = [
  { id: 1, name: "منتج أ", price: 150, stock: 45, category: "إلكترونيات" },
  { id: 2, name: "منتج ب", price: 250, stock: 30, category: "ملابس" },
  { id: 3, name: "منتج ج", price: 80, stock: 100, category: "أغذية" },
  { id: 4, name: "منتج د", price: 320, stock: 12, category: "إلكترونيات" },
];

export function POSDashboard() {
  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">نقاط البيع</h1>
          <p className="text-sm text-muted-foreground">
            إدارة المبيعات والطلبات
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Receipt className="size-4 mr-2" />
            الفواتير
          </Button>
          <Button>
            <Plus className="size-4 mr-2" />
            منتج جديد
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          {
            label: "مبيعات اليوم",
            value: "45,680",
            icon: "💰",
            color: "text-success",
          },
          { label: "الطلبات", value: "128", icon: "📦", color: "text-brand" },
          {
            label: "الزبائن اليوم",
            value: "89",
            icon: "👥",
            color: "text-info",
          },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <span className="text-3xl">{stat.icon}</span>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={cn("text-2xl font-bold", stat.color)}>
                    {stat.value}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>المنتجات</CardTitle>
        </CardHeader>
        <CardContent>
          <DataGrid
            data={mockProducts}
            columns={[
              { key: "name", header: "الاسم" },
              { key: "category", header: "التصنيف" },
              { key: "price", header: "السعر", numeric: true },
              { key: "stock", header: "المخزون", numeric: true },
            ]}
            pageSize={5}
          />
        </CardContent>
      </Card>
    </div>
  );
}
