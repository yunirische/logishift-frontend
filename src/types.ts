export interface User {
  id: number;
  full_name: string;
  role: 'admin' | 'driver';
  tenant_id: number;
}

export interface Truck {
  id: number;
  name: string;
  code: string;
  plate: string;
  is_active: boolean;
}

export interface Site {
  id: number;
  name: string;
  address: string;
}

export interface Shift {
  id: number;
  user_id: number;
  truck_id: number | null;
  site_id: number | null;
  start_time: string;
  end_time: string | null;
  status: 'active' | 'finished' | 'pending_invoice';
  driver_name?: string;
  truck_name?: string;
  site_name?: string;
}