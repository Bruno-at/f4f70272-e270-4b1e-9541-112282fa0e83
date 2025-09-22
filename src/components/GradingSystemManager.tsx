import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";

interface GradingSystem {
  id: string;
  grade_name: string;
  min_percentage: number;
  max_percentage: number;
  description?: string;
  is_active: boolean;
}

const GradingSystemManager = () => {
  const [gradingSystems, setGradingSystems] = useState<GradingSystem[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GradingSystem | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    grade_name: '',
    min_percentage: '',
    max_percentage: '',
    description: ''
  });

  useEffect(() => {
    fetchGradingSystems();
  }, []);

  const fetchGradingSystems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('grading_systems')
        .select('*')
        .eq('is_active', true)
        .order('min_percentage', { ascending: false });

      if (error) throw error;
      setGradingSystems(data || []);
    } catch (error) {
      console.error('Error fetching grading systems:', error);
      toast({
        title: "Error",
        description: "Failed to fetch grading systems",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const gradingData = {
        grade_name: formData.grade_name,
        min_percentage: parseFloat(formData.min_percentage),
        max_percentage: parseFloat(formData.max_percentage),
        description: formData.description || null
      };

      if (editingItem) {
        const { error } = await supabase
          .from('grading_systems')
          .update(gradingData)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Grading system updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('grading_systems')
          .insert([gradingData]);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Grading system created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchGradingSystems();
    } catch (error) {
      console.error('Error saving grading system:', error);
      toast({
        title: "Error",
        description: "Failed to save grading system",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: GradingSystem) => {
    setEditingItem(item);
    setFormData({
      grade_name: item.grade_name,
      min_percentage: item.min_percentage.toString(),
      max_percentage: item.max_percentage.toString(),
      description: item.description || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this grading system?')) return;

    try {
      const { error } = await supabase
        .from('grading_systems')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Grading system deleted successfully",
      });
      fetchGradingSystems();
    } catch (error) {
      console.error('Error deleting grading system:', error);
      toast({
        title: "Error",
        description: "Failed to delete grading system",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      grade_name: '',
      min_percentage: '',
      max_percentage: '',
      description: ''
    });
    setEditingItem(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  if (loading) {
    return <div>Loading grading systems...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grading System Management</CardTitle>
        <CardDescription>
          Configure the school's grading system and grade boundaries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Current Grading System</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleDialogClose()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Grade
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Add'} Grade</DialogTitle>
                <DialogDescription>
                  Configure the grade name and percentage boundaries
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="grade_name">Grade Name</Label>
                    <Input
                      id="grade_name"
                      value={formData.grade_name}
                      onChange={(e) => setFormData(prev => ({...prev, grade_name: e.target.value}))}
                      placeholder="A, B, C, etc."
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="min_percentage">Min Percentage</Label>
                    <Input
                      id="min_percentage"
                      type="number"
                      step="0.1"
                      value={formData.min_percentage}
                      onChange={(e) => setFormData(prev => ({...prev, min_percentage: e.target.value}))}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="max_percentage">Max Percentage</Label>
                  <Input
                    id="max_percentage"
                    type="number"
                    step="0.1"
                    value={formData.max_percentage}
                    onChange={(e) => setFormData(prev => ({...prev, max_percentage: e.target.value}))}
                    placeholder="100"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                    placeholder="e.g., Excellent, Good, etc."
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grade</TableHead>
              <TableHead>Range (%)</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gradingSystems.map((grade) => (
              <TableRow key={grade.id}>
                <TableCell className="font-medium">{grade.grade_name}</TableCell>
                <TableCell>{grade.min_percentage}% - {grade.max_percentage}%</TableCell>
                <TableCell>{grade.description || '-'}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(grade)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(grade.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default GradingSystemManager;