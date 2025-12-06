import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, School, Users, Download, BookOpen, User, FileText, Settings, MessageSquare, Pencil } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { ThemeToggle } from './ThemeToggle';
import SchoolInfoTable from './SchoolInfoTable';
import StudentManager from './StudentManager';
import ReportGenerator from './ReportGenerator';
import TermsManager from './TermsManager';
import ClassesManager from './ClassesManager';
import SubjectsManager from './SubjectsManager';
import StudentMarksManager from './StudentMarksManager';
import GradingSystemManager from './GradingSystemManager';
import CommentTemplatesManager from './CommentTemplatesManager';
import TeacherDashboard from './TeacherDashboard';

const ReportCardGenerator = () => {
  const [activeSection, setActiveSection] = useState('school');

  const renderContent = () => {
    switch (activeSection) {
      case 'school':
        return (
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
        );
      case 'terms':
        return (
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
        );
      case 'classes':
        return (
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
        );
      case 'subjects':
        return (
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
        );
      case 'students':
        return (
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
        );
      case 'marks':
        return (
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
        );
      case 'grading':
        return (
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
        );
      case 'comments':
        return (
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
        );
      case 'reports':
        return (
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
        );
      case 'teacher-dashboard':
        return <TeacherDashboard />;
      default:
        return null;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        
        <main className="flex-1">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-primary">Report Card Generator</h1>
              <p className="text-sm text-muted-foreground">
                Professional student report card generation system
              </p>
            </div>
            <ThemeToggle />
          </header>
          
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ReportCardGenerator;