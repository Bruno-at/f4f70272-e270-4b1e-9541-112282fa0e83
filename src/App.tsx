import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { SchoolProvider } from "./contexts/SchoolContext";
import AuthGuard from "./components/AuthGuard";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ReportCardManagement from "./pages/ReportCardManagement";
import FinancePortal from "./pages/FinancePortal";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import RegisterSchool from "./pages/RegisterSchool";
import SetupSchool from "./pages/SetupSchool";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SchoolProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register-school" element={<RegisterSchool />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/setup-school" element={<AuthGuard><SetupSchool /></AuthGuard>} />
              <Route path="/" element={<AuthGuard><Index /></AuthGuard>} />
              <Route path="/report-cards" element={<AuthGuard><ReportCardManagement /></AuthGuard>} />
              <Route path="/finance" element={<AuthGuard><FinancePortal /></AuthGuard>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </SchoolProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
