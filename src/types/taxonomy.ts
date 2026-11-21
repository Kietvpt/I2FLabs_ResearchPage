/**
 * Taxonomy Types
 * Categorization, tags, and classification taxonomy.
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export type CategoryInput = Omit<Category, 'id' | 'created_at'>;
