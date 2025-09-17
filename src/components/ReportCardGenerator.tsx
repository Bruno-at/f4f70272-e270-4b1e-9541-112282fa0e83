import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, School, Users, Download } from 'lucide-react';
import SchoolInfoManager from './SchoolInfoManager';
import StudentManager from './StudentManager';
import ReportGenerator from './ReportGenerator';

const ReportCardGenerator = () => {
  const [activeTab, setActiveTab] = useState('school');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container mx-auto p-6">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Report Card Generator</h1>
          <p className="text-muted-foreground text-lg">
            Professional student report card generation system
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="school" className="flex items-center gap-2">
              <School className="w-4 h-4" />
              School Info
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Students
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Generate Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="school">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <School className="w-5 h-5" />
                  School Information Management
                </CardTitle>
                <CardDescription>
                  Configure your school's basic information that will appear on all report cards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SchoolInfoManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Student Management
                </CardTitle>
                <CardDescription>
                  Add students individually or import from CSV files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Report Card Generation
                </CardTitle>
                <CardDescription>
                  Generate individual or bulk PDF report cards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ReportGenerator />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ReportCardGenerator;