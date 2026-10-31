import { AppSidebar } from "./AppSidebar";
import { ShieldAlert } from "lucide-react";

export function DeniedScreen({ message }: { message?: string }) {
  return (
    <div className="min-h-screen flex">
      <AppSidebar />
      <main className="flex-1 grid place-items-center bg-slate-50 p-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-800">
            ليس لديك صلاحية الوصول
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {message ?? "هذه الصفحة متاحة لمديري المؤسسة فقط."}
          </p>
        </div>
      </main>
    </div>
  );
}
