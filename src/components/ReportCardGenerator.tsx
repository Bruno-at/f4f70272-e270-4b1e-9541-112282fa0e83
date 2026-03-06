import { useState, Suspense, lazy } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, School, Users, Download, BookOpen, User, FileText, Settings, MessageSquare, Pencil } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { ThemeToggle } from './ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load all section components
const SchoolInfoTable = lazy(() => import('./SchoolInfoTable'));
const StudentManager = lazy(() => import('./StudentManager'));
const ReportGenerator = lazy(() => import('./ReportGenerator'));
const TermsManager = lazy(() => import('./TermsManager'));
const ClassesManager = lazy(() => import('./ClassesManager'));
const SubjectsManager = lazy(() => import('./SubjectsManager'));
const StudentMarksManager = lazy(() => import('./StudentMarksManager'));
const GradingSystemManager = lazy(() => import('./GradingSystemManager'));
const CommentTemplatesManager = lazy(() => import('./CommentTemplatesManager'));
const SignaturesManager = lazy(() => import('./SignaturesManager'));

const SectionLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-32 w-full" />
  </div>
);

const sectionConfig = [
  { id: 'school', title: 'School Information Management', desc: 'Configure your school\'s basic information that will appear on all report cards', icon: School, Component: SchoolInfoTable },
  { id: 'terms', title: 'Academic Terms Management', desc: 'Create and manage academic terms for your school', icon: Calendar, Component: TermsManager },
  { id: 'classes', title: 'Classes Management', desc: 'Create and manage school classes and sections', icon: Users, Component: ClassesManager },
  { id: 'subjects', title: 'Subjects Management', desc: 'Manage subjects for each class with maximum marks', icon: BookOpen, Component: SubjectsManager },
  { id: 'students', title: 'Student Management', desc: 'Add students individually or import from CSV files', icon: User, Component: StudentManager },
  { id: 'marks', title: 'Student Marks Management', desc: 'Record and manage student marks for all subjects', icon: FileText, Component: StudentMarksManager },
  { id: 'grading', title: 'Grading System Management', desc: 'Configure the school\'s grading system and grade boundaries', icon: Settings, Component: GradingSystemManager },
  { id: 'comments', title: 'Comment Templates Management', desc: 'Configure automatic comments based on student performance', icon: MessageSquare, Component: CommentTemplatesManager },
  { id: 'signatures', title: 'Digital Signatures Management', desc: 'Manage class teacher and head teacher signatures for report cards', icon: Pencil, Component: SignaturesManager },
  { id: 'reports', title: 'Report Card Generation', desc: 'Generate individual or bulk PDF report cards', icon: Download, Component: ReportGenerator },
];

const ReportCardGenerator = () => {
  const [activeSection, setActiveSection] = useState('school');
  // Track which sections have been visited to keep them mounted
  const [visitedSections, setVisitedSections] = useState<Set<string>>(new Set(['school']));

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setVisitedSections(prev => new Set(prev).add(section));
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <AppSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        
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
            {sectionConfig.map(({ id, title, desc, icon: Icon, Component }) => {
              // Only render sections that have been visited (keeps them mounted after first visit)
              if (!visitedSections.has(id)) return null;
              
              return (
                <div key={id} style={{ display: activeSection === id ? 'block' : 'none' }}>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="w-5 h-5" />
                        {title}
                      </CardTitle>
                      <CardDescription>{desc}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Suspense fallback={<SectionLoader />}>
                        <Component />
                      </Suspense>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default ReportCardGenerator;
