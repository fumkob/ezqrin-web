// 認証
export interface LoginRequest {
  email: string;
  password: string;
  client_type?: 'web' | 'mobile';
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'organizer' | 'staff';
}

// イベント
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  organizer_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  timezone: string;
  status: EventStatus;
  participant_count?: number;
  checked_in_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateEventRequest {
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  location?: string;
  timezone?: string;
  status?: EventStatus;
}

// イベント統計
export interface EventStats {
  event_id: string;
  total_participants: number;
  checked_in_count: number;
  pending_count: number;
  check_in_rate: number;
  status_breakdown: {
    confirmed: number;
    tentative: number;
    cancelled: number;
  };
  checkin_timeline: Array<{ hour: string; count: number }>;
  checkin_methods: { qrcode: number; manual: number };
}

// 参加者
export type ParticipantStatus = 'tentative' | 'confirmed' | 'cancelled' | 'declined';
export type PaymentStatus = 'unpaid' | 'paid';

export interface Participant {
  id: string;
  event_id: string;
  name: string;
  email: string;
  qr_email?: string;
  employee_id?: string;
  phone?: string;
  status: ParticipantStatus;
  payment_status: PaymentStatus;
  payment_amount?: number;
  payment_date?: string;
  qr_code?: string;
  metadata?: Record<string, unknown>;
  checked_in: boolean;
  checked_in_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateParticipantRequest {
  name: string;
  email: string;
  qr_email?: string;
  employee_id?: string;
  phone?: string;
  status?: ParticipantStatus;
  payment_status?: PaymentStatus;
  payment_amount?: number;
  payment_date?: string;
  metadata?: Record<string, unknown>;
}

// チェックイン
export interface CheckIn {
  id: string;
  event_id: string;
  participant: { id: string; name: string; email: string };
  checked_in_at: string;
  checked_in_by: { id: string; name: string };
  checkin_method: 'qrcode' | 'manual';
}

export interface PerformCheckinRequest {
  qr_code?: string;
  participant_id?: string;
  checkin_method?: 'qrcode' | 'manual';
}

// ページネーション
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// エラー
export interface ApiError {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  errors?: Array<{ field: string; message: string }>;
}
