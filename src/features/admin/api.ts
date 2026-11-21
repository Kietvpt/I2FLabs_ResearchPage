import { REPORT_ASSETS_BUCKET, formatSupabaseError, supabase } from '@/lib/supabase';
import { estimateReadingTime, slugify } from '@/lib/utils';
import type {
  Category,
  CategoryInput,
  MediaAsset,
  Report,
  ReportInput,
  ReportStatus,
  ReportWithRelations,
  ResearchDomain,
  Tag,
} from '@/types/database';

export interface CategoryWithCount extends Category {
  report_count: number;
}

interface RawReportRow extends Report {
  category?: Category | null;
  domain?: ResearchDomain | null;
  report_tags?: Array<{ tag: Tag | null }> | null;
}

function normalizeReportRow(row: RawReportRow): ReportWithRelations {
  const tags = (row.report_tags || [])
    .map((rt) => rt.tag)
    .filter((t): t is Tag => Boolean(t));

  const { report_tags: _omit, ...rest } = row;
  void _omit;

  return {
    ...rest,
    category: row.category ?? null,
    domain: row.domain ?? null,
    tags,
  };
}

export async function fetchAllReportsAdmin(): Promise<ReportWithRelations[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(
      `
      *,
      category:categories(*),
      domain:research_domains(*),
      report_tags(
        tag:tags(*)
      )
    `
    )
    .order('updated_at', { ascending: false });

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return ((data as unknown as RawReportRow[]) || []).map(normalizeReportRow);
}

export async function fetchReportByIdAdmin(id: string): Promise<ReportWithRelations> {
  const { data, error } = await supabase
    .from('reports')
    .select(
      `
      *,
      category:categories(*),
      domain:research_domains(*),
      report_tags(
        tag:tags(*)
      )
    `
    )
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  return normalizeReportRow(data as unknown as RawReportRow);
}

async function syncReportTags(reportId: string, tagNames: string[]): Promise<void> {
  const cleaned = Array.from(
    new Map(
      tagNames
        .map((name) => name.trim())
        .filter(Boolean)
        .map((name) => [slugify(name), name])
    ).entries()
  ).filter(([slug]) => Boolean(slug));

  const { error: delError } = await supabase
    .from('report_tags')
    .delete()
    .eq('report_id', reportId);

  if (delError) {
    throw new Error(formatSupabaseError(delError));
  }

  if (cleaned.length === 0) return;

  const { data: upsertedTags, error: tagError } = await supabase
    .from('tags')
    .upsert(
      cleaned.map(([slug, name]) => ({ slug, name })),
      { onConflict: 'slug' }
    )
    .select('id, slug');

  if (tagError) {
    throw new Error(formatSupabaseError(tagError));
  }

  const tagIds = (upsertedTags || []).map((t: { id: string }) => t.id);
  if (tagIds.length === 0) return;

  const { error: linkError } = await supabase.from('report_tags').insert(
    tagIds.map((tagId) => ({
      report_id: reportId,
      tag_id: tagId,
    }))
  );

  if (linkError) {
    throw new Error(formatSupabaseError(linkError));
  }
}

export async function upsertReport(input: ReportInput, id?: string): Promise<Report> {
  const { tag_names, ...fields } = input;
  const computedReadingTime = estimateReadingTime(fields.content_md || '');
  const finalSlug = slugify(fields.slug || fields.title) || `report-${Date.now()}`;

  const publishedAt =
    fields.status === 'published'
      ? fields.published_at || new Date().toISOString()
      : fields.published_at;

  const payload = {
    ...fields,
    slug: finalSlug,
    reading_time: computedReadingTime,
    published_at: publishedAt,
    category_id: fields.category_id || null,
    domain_id: fields.domain_id || null,
    cover_image_url: fields.cover_image_url?.trim() || null,
    summary: fields.summary?.trim() || null,
  };

  let saved: Report;

  if (id) {
    const { data, error } = await supabase
      .from('reports')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error));
    }
    saved = data as Report;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('reports')
      .insert({
        ...payload,
        created_by: user?.id ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error));
    }
    saved = data as Report;
  }

  if (tag_names !== undefined) {
    await syncReportTags(saved.id, tag_names);
  }

  return saved;
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from('reports').delete().eq('id', id);
  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}

export async function toggleReportStatus(
  id: string,
  nextStatus: ReportStatus
): Promise<Report> {
  const updatePayload: Partial<Report> = { status: nextStatus };
  if (nextStatus === 'published') {
    updatePayload.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('reports')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as Report;
}

export async function fetchCategoriesAdmin(): Promise<CategoryWithCount[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*, reports(count)')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(formatSupabaseError(error));
  }

  type RawCat = Category & { reports?: Array<{ count: number }> };
  return ((data as unknown as RawCat[]) || []).map((row) => {
    const { reports, ...cat } = row;
    return {
      ...cat,
      report_count: reports?.[0]?.count ?? 0,
    };
  });
}

export async function upsertCategory(
  input: CategoryInput,
  id?: string
): Promise<Category> {
  const payload = {
    name: input.name.trim(),
    slug: slugify(input.slug || input.name),
    description: input.description?.trim() || null,
    color: input.color || '#2563EB',
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
  };

  if (id) {
    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      throw new Error(formatSupabaseError(error));
    }
    return data as Category;
  }

  const { data, error } = await supabase
    .from('categories')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return data as Category;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}

export async function fetchMediaAssets(): Promise<MediaAsset[]> {
  const { data, error } = await supabase
    .from('media')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(formatSupabaseError(error));
  }
  return (data as MediaAsset[]) || [];
}

export async function deleteMediaAsset(asset: MediaAsset): Promise<void> {
  if (asset.storage_path) {
    const { error: storageError } = await supabase.storage
      .from(REPORT_ASSETS_BUCKET)
      .remove([asset.storage_path]);
    if (storageError) {
      console.warn('[Media] Xóa file trên Storage gặp lỗi:', storageError.message);
    }
  }

  const { error } = await supabase.from('media').delete().eq('id', asset.id);
  if (error) {
    throw new Error(formatSupabaseError(error));
  }
}
