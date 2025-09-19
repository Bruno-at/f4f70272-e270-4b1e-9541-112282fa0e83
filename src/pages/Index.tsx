import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import ReportCardGenerator from '@/components/ReportCardGenerator';
import TeacherSubmissions from '@/components/TeacherSubmissions';
import AdminApproval from '@/components/AdminApproval';
import ReportCardManager from '@/components/ReportCardManager';
import { LogOut, GraduationCap, Shield, Users } from 'lucide-react';

const Index = () => {
  const { user, profile, signOut, loading, isAdmin, isTeacher } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-primary mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // This should not happen due to ProtectedRoute, but just in case
  }

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <GraduationCap className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">School Report System</h1>
              <p className="text-muted-foreground">
                Welcome back, {profile.full_name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <>
                  <Shield className="w-4 h-4" />
                  <Badge variant="secondary">Administrator</Badge>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <Badge variant="outline">Teacher</Badge>
                </>
              )}
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {isAdmin ? (
          <Tabs defaultValue="approvals" className="space-y-6">
            <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
              <TabsTrigger value="approvals">Pending Approvals</TabsTrigger>
              <TabsTrigger value="reports">Report Cards</TabsTrigger>
              <TabsTrigger value="generator">Generate Reports</TabsTrigger>
              <TabsTrigger value="management">System Management</TabsTrigger>
            </TabsList>

            <TabsContent value="approvals">
              <AdminApproval />
            </TabsContent>

            <TabsContent value="reports">
              <ReportCardManager />
            </TabsContent>

            <TabsContent value="generator">
              <ReportCardGenerator />
            </TabsContent>

            <TabsContent value="management">
              <Card>
                <CardHeader>
                  <CardTitle>System Management</CardTitle>
                  <CardDescription>
                    Manage school data, students, classes, subjects, and terms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReportCardGenerator />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : isTeacher ? (
          <Tabs defaultValue="submissions" className="space-y-6">
            <TabsList className="grid grid-cols-1 w-full max-w-md">
              <TabsTrigger value="submissions">My Submissions</TabsTrigger>
            </TabsList>

            <TabsContent value="submissions">
              <TeacherSubmissions />
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Your account role is not recognized. Please contact an administrator.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
