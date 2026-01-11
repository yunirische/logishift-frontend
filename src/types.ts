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

export interface User {
  id: string;
  login: string;
  full_name: string;
  role: UserRole;
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

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      NODE_ENV: string;
      [key: string]: string | undefined;
    }
    interface Process {
      env: ProcessEnv;
    }
  }
  var process: NodeJS.Process;
}

export {};
