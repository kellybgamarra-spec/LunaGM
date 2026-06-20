import { Sidebar } from "./sidebar"
import { Topbar } from "./topbar"
import { Toaster } from "@/components/ui/sonner"

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background relative">
      <Sidebar />
      <div className="flex flex-col flex-1 w-full min-w-0">
        <Topbar />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  )
}
