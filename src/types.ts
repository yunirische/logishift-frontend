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
}

export interface Shift {
  id: number;
  start_time: string;
  end_time?: string;
  started_at?: string; // Для совместимости с UI билдера
  status: string | ShiftStatus;

  // Поля для реестра (Admin View)
  driver_name?: string;
  vehicle_plate?: string;
  work_object?: string;

  // Вложенные объекты (из Prisma include)
  truck?: { name: string; plate: string };
  site?: {
    name: string;
    odometer_required: boolean;
    invoice_required: boolean;
  };
  tenant?: { invoice_required: boolean };

  // Данные одометра и фото
  odometer_start?: number;
  odometer_finish?: number;
  invoice_url?: string;
  photo_start_url?: string;
  photo_end_url?: string;
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
