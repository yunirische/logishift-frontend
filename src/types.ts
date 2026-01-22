export enum ShiftStatus {
  ACTIVE = "active",
  PENDING_INVOICE = "pending_invoice",
  FINISHED = "finished",
}

export enum UserRole {
  DRIVER = "driver",
  FOREMAN = "foreman",
  ADMIN = "admin",
}

export enum DriverState {
  IDLE = "idle",
  PENDING_TRUCK = "pending_truck",
  PENDING_SITE = "pending_site",
  AWAITING_ODO_START = "awaiting_odo_start",
  ACTIVE = "active",
  AWAITING_ODO_END = "awaiting_odo_end",
  AWAITING_INVOICE = "awaiting_invoice",
}

export interface User {
  id: number;
  full_name: string;
  role: UserRole;
  current_state: DriverState;
  tenant_id: number;
  avatar_url?: string;
}

export interface Shift {
  id: number;
  status: string | ShiftStatus;

  // Поля для списка смен (/shifts)
  driver_name?: string;
  truck_name?: string;
  site_name?: string;
  created_at?: string;

  // Поля для текущей смены (/shifts/current)
  tenant_id?: number;
  user_id?: number;
  truck_id?: number;
  site_id?: number;
  start_time?: string;
  end_time?: string;
  hours_worked?: string;
  salary?: string;
  comment?: string;
  updated_at?: string;

  // Вложенные объекты (из /shifts/current)
  truck?: { name: string };
  site?: {
    name: string;
    odometer_required: boolean;
    invoice_required: boolean;
  };
  user?: { full_name: string };

  // Данные фото
  photo_start_url?: string;
  photo_end_url?: string;
  photo_invoice_url?: string;
}

export interface Driver {
  id: string;
  full_name: string;
  phone_number: string;
  is_active: boolean;
  vehicle_info?: string;
  last_activity?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performed_by: string;
  timestamp: string;
  details: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ManualShiftRequest {
  driver_id: number;
  truck_id: number;
  site_id: number;
}
