import React from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { WorkContextBar } from "@/components/WorkContextBar";
import { Background3D } from "@/components/Background3D";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen bg-background text-foreground flex relative"
      dir="rtl"
    >
      <Background3D variant="app" />
      <a
        href="#app-main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:right-4 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-primary-foreground focus:shadow-lg focus:outline-none"
      >
        تخطي إلى المحتوى الرئيسي
      </a>
      <AppSidebar />
      <div className="flex-1 min-w-0 flex flex-col relative z-10">
        <AppHeader />
        {/* شريط السياق الدائم — يتابع المستخدم بين كل شاشات مساحة العمل */}
        <WorkContextBar />
        <main id="app-main-content" className="app-workspace flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-6" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
