export enum ShiftStatus {
  ACTIVE = "Active",
  PENDING_INVOICE = "Pending Invoice",
  FINISHED = "Finished",
}

export enum UserRole {
  DRIVER = "driver",
  FOREMAN = "foreman",
  ADMIN = "admin",
}

export interface Shift {
  id: string;
  driver_name: string;
  vehicle_plate: string;
  work_object: string;
  started_at: string;
  finished_at?: string;
  status: ShiftStatus;
  comment?: string;
  invoice_url?: string;
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

// Глобальная декларация для process, исправляющая конфликты типов и ошибки переобъявления
declare global {
  interface ProcessEnv {
    [key: string]: string;
    API_KEY: string;
    NODE_ENV: string;
  }
  interface Process {
    // Исправлено: свойство env должно в точности соответствовать ожидаемому типу { [key: string]: string }
    env: ProcessEnv;
  }
  // Исправлено: используем var вместо const для предотвращения ошибки "Cannot redeclare block-scoped variable"
  var process: Process;
}
