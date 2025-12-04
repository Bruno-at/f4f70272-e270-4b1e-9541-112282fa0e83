import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export type TemplateType = 'classic' | 'modern' | 'professional' | 'minimal';
export type ReportColor = 'white' | 'green' | 'blue' | 'pink' | 'yellow' | 'gray';

interface TemplateSelectorProps {
  value: TemplateType;
  onChange: (template: TemplateType) => void;
  colorValue: ReportColor;
  onColorChange: (color: ReportColor) => void;
}

const reportColors: { id: ReportColor; name: string; bgClass: string; hex: string }[] = [
  { id: 'white', name: 'White', bgClass: 'bg-white', hex: '#FFFFFF' },
  { id: 'green', name: 'Green', bgClass: 'bg-green-100', hex: '#DCFCE7' },
  { id: 'blue', name: 'Blue', bgClass: 'bg-blue-100', hex: '#DBEAFE' },
  { id: 'pink', name: 'Pink', bgClass: 'bg-pink-100', hex: '#FCE7F3' },
  { id: 'yellow', name: 'Yellow', bgClass: 'bg-yellow-100', hex: '#FEF9C3' },
  { id: 'gray', name: 'Gray', bgClass: 'bg-gray-100', hex: '#F3F4F6' },
];

const templates = [
  {
    id: 'classic' as TemplateType,
    name: 'Classic',
    description: 'Traditional format with blue headers and comprehensive layout',
    preview: '/template-previews/classic.png',
    features: ['Professional header', 'Detailed subject table', 'Grade scale', 'Comments section']
  },
  {
    id: 'modern' as TemplateType,
    name: 'Modern',
    description: 'Contemporary design with gradient accents and clean spacing',
    preview: '/template-previews/modern.png',
    features: ['Gradient headers', 'Modern typography', 'Visual grade indicators', 'Streamlined layout']
  },
  {
    id: 'professional' as TemplateType,
    name: 'Professional',
    description: 'Corporate style with emphasis on data presentation',
    preview: '/template-previews/professional.png',
    features: ['Formal design', 'Data-focused tables', 'Performance charts', 'Executive summary']
  },
  {
    id: 'minimal' as TemplateType,
    name: 'Minimal',
    description: 'Clean and simple with focus on essential information',
    preview: '/template-previews/minimal.png',
    features: ['Minimalist design', 'Essential info only', 'Clear typography', 'Spacious layout']
  }
];

const TemplatePreview = ({ template }: { template: typeof templates[0] }) => {
  return (
    <div className="space-y-4">
      <div className="bg-muted p-8 rounded-lg">
        <div className="bg-card border-2 border-border rounded-lg shadow-lg max-w-2xl mx-auto">
          {/* Template Preview Mockup */}
          {template.id === 'classic' && (
            <div className="p-6 space-y-3">
              <div className="bg-primary text-primary-foreground p-3 rounded text-center">
                <h3 className="font-bold text-lg">SCHOOL NAME</h3>
                <p className="text-xs">Contact Information</p>
              </div>
              <div className="bg-primary text-primary-foreground p-2 text-center">
                <p className="font-bold">TERM REPORT CARD 2025</p>
              </div>
              <div className="border-t-2 border-destructive my-2"></div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <p>NAME: Student Name</p>
                <p>GENDER: Female</p>
                <p>CLASS: S.1</p>
                <p>TERM: ONE</p>
              </div>
              <div className="border-t-2 border-destructive my-2"></div>
              <div className="bg-primary text-primary-foreground p-2 text-center">
                <p className="font-bold text-sm">PERFORMANCE RECORDS</p>
              </div>
              <div className="space-y-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="grid grid-cols-6 gap-1 text-xs bg-muted/50 p-1">
                    <span>Subject {i}</span>
                    <span>A</span>
                    <span>B</span>
                    <span>85</span>
                    <span>2</span>
                    <span>Outstanding</span>
                  </div>
                ))}
              </div>
              <div className="text-xs space-y-1 mt-3">
                <p className="font-bold">Class teacher's Comment:</p>
                <p className="text-muted-foreground">Excellent performance...</p>
              </div>
            </div>
          )}
          
          {template.id === 'modern' && (
            <div className="p-6 space-y-3">
              <div className="bg-gradient-to-r from-primary to-primary/70 text-primary-foreground p-4 rounded-lg">
                <h3 className="font-bold text-xl">SCHOOL NAME</h3>
                <p className="text-sm opacity-90">Academic Excellence</p>
              </div>
              <div className="bg-gradient-to-r from-secondary to-secondary/70 text-secondary-foreground p-2 rounded-lg text-center">
                <p className="font-bold">Term Report • 2025</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm bg-muted/30 p-3 rounded-lg">
                <div>
                  <p className="font-semibold">Student Name</p>
                  <p className="text-xs text-muted-foreground">Class S.1 • Term One</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Grade: A</p>
                  <p className="text-xs text-muted-foreground">Average: 85%</p>
                </div>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between bg-card border rounded-lg p-2 text-sm">
                    <span className="font-medium">Subject {i}</span>
                    <div className="flex gap-2 items-center">
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded">85%</span>
                      <span className="bg-green-500/10 text-green-600 px-2 py-1 rounded text-xs">Outstanding</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-muted/30 p-3 rounded-lg text-xs space-y-1">
                <p className="font-bold">Teacher's Feedback</p>
                <p className="text-muted-foreground">Showing great progress...</p>
              </div>
            </div>
          )}
          
          {template.id === 'professional' && (
            <div className="p-6 space-y-3">
              <div className="border-b-4 border-primary pb-3">
                <h3 className="font-bold text-xl text-primary">SCHOOL NAME</h3>
                <p className="text-xs text-muted-foreground">Official Academic Report</p>
              </div>
              <div className="grid grid-cols-3 gap-2 bg-muted p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Student</p>
                  <p className="font-bold">Name</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Class</p>
                  <p className="font-bold">S.1</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Term</p>
                  <p className="font-bold">ONE 2025</p>
                </div>
              </div>
              <div className="border border-border">
                <div className="bg-primary text-primary-foreground px-2 py-1 text-xs font-bold">
                  ACADEMIC PERFORMANCE
                </div>
                <div className="divide-y">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="grid grid-cols-4 gap-2 p-2 text-xs">
                      <span className="font-medium">Subject {i}</span>
                      <span>85%</span>
                      <span>Grade A</span>
                      <span className="text-green-600">Excellent</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t-2 pt-2 text-xs space-y-1">
                <p className="font-bold">EVALUATION SUMMARY</p>
                <p className="text-muted-foreground">Overall performance is commendable...</p>
              </div>
            </div>
          )}
          
          {template.id === 'minimal' && (
            <div className="p-8 space-y-4">
              <div className="text-center space-y-1">
                <h3 className="font-bold text-2xl">School Name</h3>
                <p className="text-sm text-muted-foreground">Term Report 2025</p>
              </div>
              <div className="border-t border-b py-3 space-y-1">
                <p className="text-sm"><span className="font-medium">Student:</span> Name</p>
                <p className="text-sm"><span className="font-medium">Class:</span> S.1 • <span className="font-medium">Term:</span> ONE</p>
              </div>
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b text-sm">
                    <span>Subject {i}</span>
                    <div className="flex gap-4">
                      <span className="font-medium">85%</span>
                      <span className="text-muted-foreground">Grade A</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-4 space-y-2 text-sm">
                <p className="font-medium">Overall: Grade A (85%)</p>
                <p className="text-muted-foreground">Strong performance across all subjects.</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div>
        <h4 className="font-semibold mb-2">Features:</h4>
        <ul className="space-y-1">
          {template.features.map((feature, index) => (
            <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export const TemplateSelector = ({ value, onChange, colorValue, onColorChange }: TemplateSelectorProps) => {
  const [previewTemplate, setPreviewTemplate] = useState<typeof templates[0] | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label className="text-base">Select Report Card Template</Label>
        <RadioGroup value={value} onValueChange={(val) => onChange(val as TemplateType)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all ${
                  value === template.id ? 'ring-2 ring-primary' : 'hover:border-primary'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={template.id} className="text-base font-semibold cursor-pointer">
                          {template.name}
                        </Label>
                        <Dialog open={previewTemplate?.id === template.id} onOpenChange={(open) => !open && setPreviewTemplate(null)}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPreviewTemplate(template);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Preview
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[90vh]">
                            <DialogHeader>
                              <DialogTitle>{template.name} Template Preview</DialogTitle>
                            </DialogHeader>
                            <ScrollArea className="max-h-[calc(90vh-100px)]">
                              <TemplatePreview template={template} />
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {template.features.slice(0, 2).map((feature, idx) => (
                          <span key={idx} className="text-xs bg-muted px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </RadioGroup>
      </div>

      <div className="space-y-4">
        <Label className="text-base">Select Report Card Color</Label>
        <div className="flex flex-wrap gap-3">
          {reportColors.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => onColorChange(color.id)}
              className={`relative w-12 h-12 rounded-lg border-2 transition-all ${color.bgClass} ${
                colorValue === color.id 
                  ? 'border-primary ring-2 ring-primary ring-offset-2' 
                  : 'border-border hover:border-primary/50'
              }`}
              title={color.name}
            >
              {colorValue === color.id && (
                <Check className="w-5 h-5 absolute inset-0 m-auto text-primary" />
              )}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          Selected: <span className="font-medium">{reportColors.find(c => c.id === colorValue)?.name}</span> - This color will be applied to the entire report card background
        </p>
      </div>
    </div>
  );
};

export { reportColors };
