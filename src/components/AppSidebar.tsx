import { Calendar, School, Users, Download, BookOpen, User, FileText, Settings, MessageSquare } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

const menuItems = [
  { id: 'school', title: 'School', icon: School },
  { id: 'terms', title: 'Terms', icon: Calendar },
  { id: 'classes', title: 'Classes', icon: Users },
  { id: 'subjects', title: 'Subjects', icon: BookOpen },
  { id: 'students', title: 'Students', icon: User },
  { id: 'marks', title: 'Marks', icon: FileText },
  { id: 'grading', title: 'Grading', icon: Settings },
  { id: 'comments', title: 'Comments', icon: MessageSquare },
  { id: 'reports', title: 'Reports', icon: Download },
];

interface AppSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  const handleItemClick = (sectionId: string) => {
    onSectionChange(sectionId);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    onClick={() => handleItemClick(item.id)}
                    isActive={activeSection === item.id}
                    tooltip={item.title}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
