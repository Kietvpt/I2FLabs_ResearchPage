/**
 * Administration, Auth Profiles & Media Asset Types
 */

export type AdminRole = 'admin' | 'editor';

export interface AdminProfile {
  user_id: string;
  display_name: string;
  role: AdminRole;
  created_at: string;
}

export interface MediaAsset {
  id: string;
  report_id: string | null;
  storage_path: string;
  public_url: string;
  alt_text: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  width: number | null;
  height: number | null;
  uploaded_by: string | null;
  created_at: string;
}
