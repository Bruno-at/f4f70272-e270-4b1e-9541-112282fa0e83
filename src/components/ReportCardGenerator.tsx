import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, School, Users, Download, BookOpen, User, FileText, Settings, MessageSquare } from 'lucide-react';
import SchoolInfoTable from './SchoolInfoTable';
import StudentManager from './StudentManager';
import ReportGenerator from './ReportGenerator';
import TermsManager from './TermsManager';
import ClassesManager from './ClassesManager';
import SubjectsManager from './SubjectsManager';
import StudentMarksManager from './StudentMarksManager';
import GradingSystemManager from './GradingSystemManager';
import CommentTemplatesManager from './CommentTemplatesManager';

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
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9 mb-8 h-auto p-2 gap-1">
            <TabsTrigger value="school" className="flex items-center gap-1 text-xs">
              <School className="w-3 h-3" />
              School
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              Terms
            </TabsTrigger>
            <TabsTrigger value="classes" className="flex items-center gap-1 text-xs">
              <Users className="w-3 h-3" />
              Classes
            </TabsTrigger>
            <TabsTrigger value="subjects" className="flex items-center gap-1 text-xs">
              <BookOpen className="w-3 h-3" />
              Subjects
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-1 text-xs">
              <User className="w-3 h-3" />
              Students
            </TabsTrigger>
            <TabsTrigger value="marks" className="flex items-center gap-1 text-xs">
              <FileText className="w-3 h-3" />
              Marks
            </TabsTrigger>
            <TabsTrigger value="grading" className="flex items-center gap-1 text-xs">
              <Settings className="w-3 h-3" />
              Grading
            </TabsTrigger>
            <TabsTrigger value="comments" className="flex items-center gap-1 text-xs">
              <MessageSquare className="w-3 h-3" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1 text-xs">
              <Download className="w-3 h-3" />
              Reports
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
                <SchoolInfoTable />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Academic Terms Management
                </CardTitle>
                <CardDescription>
                  Create and manage academic terms for your school
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TermsManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Classes Management
                </CardTitle>
                <CardDescription>
                  Create and manage school classes and sections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClassesManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subjects">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Subjects Management
                </CardTitle>
                <CardDescription>
                  Manage subjects for each class with maximum marks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SubjectsManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
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

          <TabsContent value="marks">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Student Marks Management
                </CardTitle>
                <CardDescription>
                  Record and manage student marks for all subjects
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StudentMarksManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grading">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Grading System Management
                </CardTitle>
                <CardDescription>
                  Configure the school's grading system and grade boundaries
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GradingSystemManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="comments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Comment Templates Management
                </CardTitle>
                <CardDescription>
                  Configure automatic comments based on student performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CommentTemplatesManager />
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