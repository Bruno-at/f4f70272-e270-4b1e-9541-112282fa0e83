import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Student, Class, StudentCSVData } from '@/types/database';
import { Upload, Plus, Download, FileSpreadsheet } from 'lucide-react';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import StudentList from './StudentList';

const StudentManager = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState('add');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    class_id: '',
    house: '',
    student_id: '',
    age: '',
    photo_url: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [studentsResult, classesResult] = await Promise.all([
        supabase.from('students').select('*, classes!students_class_id_fkey(*)').order('name'),
        supabase.from('classes').select('*').order('class_name')
      ]);

      if (studentsResult.error) throw studentsResult.error;
      if (classesResult.error) throw classesResult.error;

      setStudents(studentsResult.data || []);
      setClasses(classesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('student-photos')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('student-photos')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      name: student.name,
      gender: student.gender,
      class_id: student.class_id,
      house: student.house || '',
      student_id: student.student_id || '',
      age: student.age?.toString() || '',
      photo_url: student.photo_url || ''
    });
    setPhotoPreview(student.photo_url || '');
    setActiveTab('add');
  };

  const handleCancelEdit = () => {
    setEditingStudent(null);
    setFormData({
      name: '',
      gender: '',
      class_id: '',
      house: '',
      student_id: '',
      age: '',
      photo_url: ''
    });
    setPhotoFile(null);
    setPhotoPreview('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.gender || !formData.class_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      let photoUrl = formData.photo_url;

      // Upload photo if a new file is selected
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile) || '';
      }

      // Handle empty student_id as null to avoid unique constraint issues
      const dataToSubmit = {
        ...formData,
        student_id: formData.student_id.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        photo_url: photoUrl || null
      };

      if (editingStudent) {
        // Update existing student
        const { error } = await supabase
          .from('students')
          .update(dataToSubmit)
          .eq('id', editingStudent.id);

        if (error) {
          if (error.code === '23505' && error.message.includes('student_id')) {
            throw new Error('A student with this ID already exists. Please use a different ID or leave it empty.');
          }
          throw error;
        }

        toast({
          title: "Success",
          description: "Student updated successfully"
        });
      } else {
        // Insert new student
        const { error } = await supabase
          .from('students')
          .insert([dataToSubmit]);

        if (error) {
          if (error.code === '23505' && error.message.includes('student_id')) {
            throw new Error('A student with this ID already exists. Please use a different ID or leave it empty.');
          }
          throw error;
        }

        toast({
          title: "Success",
          description: "Student added successfully"
        });
      }

      handleCancelEdit();
      await fetchData();
    } catch (error: any) {
      console.error('Error saving student:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingStudent ? 'update' : 'add'} student`,
        variant: "destructive"
      });
    }
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    Papa.parse(file, {
      header: true,
      complete: async (results) => {
        try {
          const data = results.data as StudentCSVData[];
          const validStudents = [];

          for (const row of data) {
            if (row.name && row.gender && row.class) {
              // Find or create class
              let classRecord = classes.find(c => 
                c.class_name === row.class && 
                (row.section ? c.section === row.section : !c.section)
              );

              if (!classRecord) {
                const { data: newClass, error } = await supabase
                  .from('classes')
                  .insert([{
                    class_name: row.class,
                    section: row.section || null
                  }])
                  .select()
                  .single();

                if (error) throw error;
                classRecord = newClass;
              }

              validStudents.push({
                name: row.name,
                gender: row.gender as 'Male' | 'Female',
                class_id: classRecord.id,
                house: row.house || null,
                student_id: row.student_id?.trim() || null
              });
            }
          }

          if (validStudents.length > 0) {
            const { error } = await supabase
              .from('students')
              .insert(validStudents);

            if (error) throw error;

            toast({
              title: "Success",
              description: `${validStudents.length} students imported successfully`
            });

            await fetchData();
          } else {
            toast({
              title: "Warning",
              description: "No valid student records found in the CSV file",
              variant: "destructive"
            });
          }
        } catch (error: any) {
          console.error('Error importing students:', error);
          const errorMessage = error.code === '23505' && error.message?.includes('student_id')
            ? 'Some students have duplicate IDs. Please ensure all student IDs are unique.'
            : 'Failed to import students from CSV';
          
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive"
          });
        } finally {
          setUploading(false);
          e.target.value = '';
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast({
          title: "Error",
          description: "Failed to parse CSV file",
          variant: "destructive"
        });
        setUploading(false);
        e.target.value = '';
      }
    });
  };

  const downloadCSVTemplate = () => {
    const csvContent = `name,gender,class,section,house,student_id
John Doe,Male,Grade 7,A,Red House,ST001
Jane Smith,Female,Grade 7,B,Blue House,ST002`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'student_import_template.csv');
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="add">{editingStudent ? 'Edit Student' : 'Add Student'}</TabsTrigger>
        <TabsTrigger value="import">Import CSV</TabsTrigger>
        <TabsTrigger value="list">View Students</TabsTrigger>
      </TabsList>

      <TabsContent value="add" className="space-y-6">
        {editingStudent && (
          <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
            <span className="text-sm font-medium">Editing: {editingStudent.name}</span>
            <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
              Cancel Edit
            </Button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Student Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                placeholder="Enter student name"
              />
            </div>

            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="class">Class *</Label>
              <Select value={formData.class_id} onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.class_name} {cls.section ? `- ${cls.section}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="house">House</Label>
              <Input
                id="house"
                value={formData.house}
                onChange={(e) => setFormData(prev => ({ ...prev, house: e.target.value }))}
                placeholder="Enter house name"
              />
            </div>

            <div>
              <Label htmlFor="age">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                placeholder="Enter age"
                min="1"
                max="100"
              />
            </div>

            <div>
              <Label htmlFor="student_id">Student ID</Label>
              <Input
                id="student_id"
                value={formData.student_id}
                onChange={(e) => setFormData(prev => ({ ...prev, student_id: e.target.value }))}
                placeholder="Enter student ID (optional)"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="photo">Student Photo</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="cursor-pointer"
              />
              {photoPreview && (
                <div className="mt-2">
                  <img 
                    src={photoPreview} 
                    alt="Student preview" 
                    className="w-32 h-32 object-cover rounded-lg border"
                  />
                </div>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            {editingStudent ? 'Update Student' : 'Add Student'}
          </Button>
        </form>
      </TabsContent>

      <TabsContent value="import" className="space-y-6">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={downloadCSVTemplate}
              variant="outline"
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>
          </div>

          <div>
            <Label htmlFor="csv-upload">Upload CSV File</Label>
            <Input
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              disabled={uploading}
              className="cursor-pointer"
            />
            {uploading && (
              <p className="text-sm text-muted-foreground mt-2">
                Processing CSV file...
              </p>
            )}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">CSV Format Requirements:</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Required columns: name, gender, class</li>
              <li>• Optional columns: section, house, student_id</li>
              <li>• Gender must be "Male" or "Female"</li>
              <li>• Classes will be created automatically if they don't exist</li>
            </ul>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="list">
        <StudentList students={students} onRefresh={fetchData} onEdit={handleEdit} />
      </TabsContent>
    </Tabs>
  );
};

export default StudentManager;