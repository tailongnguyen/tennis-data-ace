import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppSidebar } from "@/components/layout/app-sidebar";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Players from "./pages/Players";
import Matches from "./pages/Matches";
import Rankings from "./pages/Rankings";
import Analytics from "./pages/Analytics";
import Export from "./pages/Export";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <main className="flex-1">
              <div className="flex items-center h-16 px-4 border-b">
                <SidebarTrigger />
                <h1 className="text-xl font-bold ml-4">Tennis Tracker</h1>
              </div>
              <div className="p-4">
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/players" element={<Players />} />
                  <Route path="/matches" element={<Matches />} />
                  <Route path="/rankings" element={<Rankings />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/export" element={<Export />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </main>
          </div>
        </SidebarProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
