export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  assignedTo?: string;
  assignedToName?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  createdBy: string;
  createdByName?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}
