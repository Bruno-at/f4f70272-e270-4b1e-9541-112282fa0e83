import { Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, CreditCard, Award, Edit, ClipboardList } from 'lucide-react';

const FeeStructureManager = lazy(() => import('@/components/finance/FeeStructureManager'));
const PaymentManager = lazy(() => import('@/components/finance/PaymentManager'));
const BursaryManager = lazy(() => import('@/components/finance/BursaryManager'));
const BalanceOverrideManager = lazy(() => import('@/components/finance/BalanceOverrideManager'));
const AuditLogViewer = lazy(() => import('@/components/finance/AuditLogViewer'));

const Loader = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const FinancePortal = () => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <AppSidebar activeSection="finance" onSectionChange={() => {}} />
        <main className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <DollarSign className="w-6 h-6" />
                Finance Portal
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage fee structures, payments, bursaries, and balance overrides
              </p>
            </div>
            <ThemeToggle />
          </header>

          <div className="p-6">
            <Tabs defaultValue="fee-structures" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="fee-structures" className="flex items-center gap-1 text-xs">
                  <DollarSign className="w-3 h-3" />Fee Structures
                </TabsTrigger>
                <TabsTrigger value="payments" className="flex items-center gap-1 text-xs">
                  <CreditCard className="w-3 h-3" />Payments
                </TabsTrigger>
                <TabsTrigger value="bursaries" className="flex items-center gap-1 text-xs">
                  <Award className="w-3 h-3" />Bursaries
                </TabsTrigger>
                <TabsTrigger value="overrides" className="flex items-center gap-1 text-xs">
                  <Edit className="w-3 h-3" />Overrides
                </TabsTrigger>
                <TabsTrigger value="audit" className="flex items-center gap-1 text-xs">
                  <ClipboardList className="w-3 h-3" />Audit Logs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="fee-structures">
                <Card>
                  <CardHeader>
                    <CardTitle>Fee Structures</CardTitle>
                    <CardDescription>Configure the total fees per class per term</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<Loader />}><FeeStructureManager /></Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payments">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Recording</CardTitle>
                    <CardDescription>Record student fee payments (cash, bank, mobile money, online)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<Loader />}><PaymentManager /></Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bursaries">
                <Card>
                  <CardHeader>
                    <CardTitle>Bursary & Scholarship Management</CardTitle>
                    <CardDescription>Configure bursaries and scholarships for students (full, half, or custom percentage)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<Loader />}><BursaryManager /></Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="overrides">
                <Card>
                  <CardHeader>
                    <CardTitle>Balance Overrides</CardTitle>
                    <CardDescription>Manually override auto-calculated balances for special cases</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<Loader />}><BalanceOverrideManager /></Suspense>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="audit">
                <Card>
                  <CardHeader>
                    <CardTitle>Audit Logs</CardTitle>
                    <CardDescription>View all financial transactions and modifications</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<Loader />}><AuditLogViewer /></Suspense>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default FinancePortal;
