import * as React from "react";
import { cn } from "@/lib/utils";
import { Search, Bell, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface DashboardHeaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

export function DashboardHeader({
  title,
  subtitle,
  className,
}: DashboardHeaderProps) {
  return (
    <header data-slot="dashboard-header" className={cn("mb-6", className)}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {title || "لوحة التحكم"}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Search className="size-4" />
                <span className="sr-only">بحث</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-full max-w-md">
              <div className="flex flex-col gap-4">
                <h2 className="text-lg font-semibold">البحث السريع</h2>
                <Input
                  placeholder="ابحث عن العملاء، الفواتير..."
                  className="w-full"
                />
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    نتائج حديثة
                  </p>
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent cursor-pointer"
                    >
                      <div className="size-8 rounded-full bg-muted" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">نتيجة {i}</p>
                        <p className="text-xs text-muted-foreground">
                          وصف النتيجة
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-brand" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="size-4" />
          </Button>
          <Avatar>
            <AvatarFallback>أ</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
