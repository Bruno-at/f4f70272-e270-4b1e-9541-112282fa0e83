import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Plus } from "lucide-react";

interface CommentTemplate {
  id: string;
  comment_type: 'class_teacher' | 'headteacher';
  min_average: number;
  max_average: number;
  comment_text: string;
  is_active: boolean;
}

const CommentTemplatesManager = () => {
  const [classTeacherComments, setClassTeacherComments] = useState<CommentTemplate[]>([]);
  const [headteacherComments, setHeadteacherComments] = useState<CommentTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CommentTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    comment_type: 'class_teacher' as 'class_teacher' | 'headteacher',
    min_average: '',
    max_average: '',
    comment_text: ''
  });

  useEffect(() => {
    fetchCommentTemplates();
  }, []);

  const fetchCommentTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('comment_templates')
        .select('*')
        .eq('is_active', true)
        .order('min_average', { ascending: false });

      if (error) throw error;
      
      const comments = data || [];
      setClassTeacherComments(comments.filter(c => c.comment_type === 'class_teacher') as CommentTemplate[]);
      setHeadteacherComments(comments.filter(c => c.comment_type === 'headteacher') as CommentTemplate[]);
    } catch (error) {
      console.error('Error fetching comment templates:', error);
      toast({
        title: "Error",
        description: "Failed to fetch comment templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const commentData = {
        comment_type: formData.comment_type,
        min_average: parseFloat(formData.min_average),
        max_average: parseFloat(formData.max_average),
        comment_text: formData.comment_text
      };

      if (editingItem) {
        const { error } = await supabase
          .from('comment_templates')
          .update(commentData)
          .eq('id', editingItem.id);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Comment template updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('comment_templates')
          .insert([commentData]);
        
        if (error) throw error;
        toast({
          title: "Success",
          description: "Comment template created successfully",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCommentTemplates();
    } catch (error) {
      console.error('Error saving comment template:', error);
      toast({
        title: "Error",
        description: "Failed to save comment template",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: CommentTemplate) => {
    setEditingItem(item);
    setFormData({
      comment_type: item.comment_type,
      min_average: item.min_average.toString(),
      max_average: item.max_average.toString(),
      comment_text: item.comment_text
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this comment template?')) return;

    try {
      const { error } = await supabase
        .from('comment_templates')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Comment template deleted successfully",
      });
      fetchCommentTemplates();
    } catch (error) {
      console.error('Error deleting comment template:', error);
      toast({
        title: "Error",
        description: "Failed to delete comment template",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      comment_type: 'class_teacher',
      min_average: '',
      max_average: '',
      comment_text: ''
    });
    setEditingItem(null);
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    resetForm();
  };

  const renderCommentsTable = (comments: CommentTemplate[], type: string) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Score Range (%)</TableHead>
          <TableHead>Comment</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {comments.map((comment) => (
          <TableRow key={comment.id}>
            <TableCell>{comment.min_average}% - {comment.max_average}%</TableCell>
            <TableCell className="max-w-md">
              <div className="truncate" title={comment.comment_text}>
                {comment.comment_text}
              </div>
            </TableCell>
            <TableCell>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(comment)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(comment.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  if (loading) {
    return <div>Loading comment templates...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comment Templates Management</CardTitle>
        <CardDescription>
          Configure automatic comments based on student performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Comment Templates</h3>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleDialogClose()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Comment Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit' : 'Add'} Comment Template</DialogTitle>
                <DialogDescription>
                  Configure automatic comments based on student average scores
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="comment_type">Comment Type</Label>
                  <Select
                    value={formData.comment_type}
                    onValueChange={(value: 'class_teacher' | 'headteacher') => 
                      setFormData(prev => ({...prev, comment_type: value}))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="class_teacher">Class Teacher</SelectItem>
                      <SelectItem value="headteacher">Headteacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_average">Min Average (%)</Label>
                    <Input
                      id="min_average"
                      type="number"
                      step="0.1"
                      value={formData.min_average}
                      onChange={(e) => setFormData(prev => ({...prev, min_average: e.target.value}))}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_average">Max Average (%)</Label>
                    <Input
                      id="max_average"
                      type="number"
                      step="0.1"
                      value={formData.max_average}
                      onChange={(e) => setFormData(prev => ({...prev, max_average: e.target.value}))}
                      placeholder="100"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="comment_text">Comment Text</Label>
                  <Textarea
                    id="comment_text"
                    value={formData.comment_text}
                    onChange={(e) => setFormData(prev => ({...prev, comment_text: e.target.value}))}
                    placeholder="Enter the comment template..."
                    rows={4}
                    required
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

        <Tabs defaultValue="class_teacher" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="class_teacher">Class Teacher Comments</TabsTrigger>
            <TabsTrigger value="headteacher">Headteacher Comments</TabsTrigger>
          </TabsList>
          <TabsContent value="class_teacher">
            {renderCommentsTable(classTeacherComments, 'Class Teacher')}
          </TabsContent>
          <TabsContent value="headteacher">
            {renderCommentsTable(headteacherComments, 'Headteacher')}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CommentTemplatesManager;