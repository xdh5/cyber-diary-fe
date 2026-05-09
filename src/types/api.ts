export interface SendCodeRequest {
  email: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  code: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  password_required?: boolean;
}

export interface UserInfo {
  email: string;
  nickname: string;
  avatar_url?: string | null;
  is_superuser: boolean;
}

export interface SetPasswordRequest {
  new_password: string;
  old_password?: string;
}

export interface UpdateProfileRequest {
  nickname?: string;
  avatar_url?: string | null;
}
