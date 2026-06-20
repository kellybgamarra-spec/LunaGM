"use client"

import { Menu, Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button, buttonVariants } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { Sidebar } from "./sidebar"

export function Topbar() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 w-full glass border-b px-4 h-16 flex items-center justify-between lg:justify-end">
      {/* Mobile Menu Trigger */}
      <div className="lg:hidden flex items-center">
        <Sheet>
          <SheetTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "shrink-0 text-muted-foreground hover:text-primary")}>
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 border-r-0">
            {/* The sidebar will stretch to fill the sheet */}
            <div className="h-full bg-background [&>aside]:w-full [&>aside]:border-none [&>aside]:flex">
              <Sidebar />
            </div>
          </SheetContent>
        </Sheet>
        
        {/* Mobile Logo Title */}
        <span className="ml-3 font-bold text-lg text-foreground">LunaGM</span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="rounded-full bg-input hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}
