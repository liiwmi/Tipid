export interface Appliance {
  id: string;
  user_id: string;
  name: string;
  watts: number;
  hours_per_day: number;
  priority: 'low' | 'medium' | 'high';
  icon: string;
  peak_start: string | null;
  peak_end: string | null;
  original_priority: 'low' | 'medium' | 'high' | null;
  is_active: boolean;
  created_at: string;
}