import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

function parseUrl(pageUrl: string) {
  try {
    return new URL(pageUrl);
  } catch {
    return null;
  }
}

function getFilter(u: URL, name: string) {
  return (
    u.searchParams.get(`filters[${name}]`) ||
    u.searchParams.get(name) ||
    null
  );
}

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function extractCategorySlug(pathname: string) {
  // /category/OBxVOd
  const p = pathname || "";
  const parts = p.split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "category") return parts[1];
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();
    const storeId = await getCurrentStoreId();
    if (!storeId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit || 2000) || 2000, 20000);

    // 1) آخر زيارات
    const { data: views, error: vErr } = await supabase
      .from("visitors_page_views")
      .select("visitor_id, path, page_url, occurred_at")
      .eq("store_id", storeId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });

    // 2) Load mappings مباشرة من جداول نظامك
    const [
      { data: brandsRows, error: bErr },
      { data: modelsRows, error: mErr },
      { data: yearsRows, error: yErr },
      { data: slugHintsRows, error: shErr },
    ] = await Promise.all([
      supabase.from("filter_brands").select("id, salla_company_id").eq("store_id", storeId),
      supabase.from("filter_models").select("id, brand_id, salla_category_id").eq("store_id", storeId),
      supabase
        .from("filter_years")
        .select("id, model_id, year, salla_year_id, salla_category_year_id")
        .eq("store_id", storeId),
      supabase
        .from("salla_category_slug_hints")
        .select("slug, salla_company_id, salla_category_id, salla_year_id")
        .eq("store_id", storeId),
    ]);

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    if (yErr) return NextResponse.json({ error: yErr.message }, { status: 500 });
    if (shErr) return NextResponse.json({ error: shErr.message }, { status: 500 });

    // brand: salla_company_id -> brand_id
    const brandByCompany = new Map<string, number>();
    (brandsRows || []).forEach((r: any) => {
      if (r?.salla_company_id) brandByCompany.set(String(r.salla_company_id), Number(r.id));
    });

    // model: salla_category_id -> model_id
    const modelByCategory = new Map<string, number>();
    const modelBrandMap = new Map<number, number>();
    (modelsRows || []).forEach((r: any) => {
      if (r?.salla_category_id) modelByCategory.set(String(r.salla_category_id), Number(r.id));
      if (r?.id != null && r?.brand_id != null) modelBrandMap.set(Number(r.id), Number(r.brand_id));
    });

    // year indexes
    const yearByModelSalla = new Map<string, number>();
    const yearCandidatesBySalla = new Map<string, Array<{ id: number; model_id: number; year: string }>>();
    const yearByModelText = new Map<string, number>();

    (yearsRows || []).forEach((r: any) => {
      const id = Number(r.id);
      const mid = Number(r.model_id);
      const yearText = String(r.year);

      yearByModelText.set(`${mid}::${yearText}`, id);

      const sallaYear = r.salla_year_id ? String(r.salla_year_id) : null;
      const sallaCatYear = r.salla_category_year_id ? String(r.salla_category_year_id) : null;

      const keys = [sallaYear, sallaCatYear].filter(Boolean) as string[];
      for (const k of keys) {
        yearByModelSalla.set(`${mid}::${k}`, id);
        if (!yearCandidatesBySalla.has(k)) yearCandidatesBySalla.set(k, []);
        yearCandidatesBySalla.get(k)!.push({ id, model_id: mid, year: yearText });
      }
    });

    // slug hints map
    const slugHints = new Map<string, { company?: string | null; category?: string | null; year?: string | null }>();
    (slugHintsRows || []).forEach((r: any) => {
      const slug = String(r.slug || "").trim();
      if (!slug) return;
      slugHints.set(slug, {
        company: r.salla_company_id ? String(r.salla_company_id) : null,
        category: r.salla_category_id ? String(r.salla_category_id) : null,
        year: r.salla_year_id ? String(r.salla_year_id) : null,
      });
    });

    // aliases للمنتجات المباشرة
    const { data: aliasesRows, error: aErr } = await supabase
      .from("vehicle_model_aliases")
      .select("model_id, alias")
      .eq("store_id", storeId);

    if (aErr) return NextResponse.json({ error: aErr.message }, { status: 500 });

    const aliasList = (aliasesRows || [])
      .map((r: any) => ({ model_id: Number(r.model_id), alias: String(r.alias || "").trim() }))
      .filter((x) => x.alias.length > 0)
      .sort((a, b) => b.alias.length - a.alias.length);

    const inserts: any[] = [];
    const slugUpserts: any[] = [];

    for (const row of views || []) {
      const pageUrl = row.page_url ? String(row.page_url) : "";
      const pathOnly = row.path ? String(row.path) : "";

      const urlFromPage = pageUrl ? parseUrl(pageUrl) : null;
      const urlFromPath = pathOnly
        ? parseUrl(pathOnly.startsWith("http") ? pathOnly : `https://darb.com.sa${pathOnly}`)
        : null;

      const uPrimary = urlFromPage || urlFromPath;
      if (!uPrimary) continue;

      const slug = extractCategorySlug(uPrimary.pathname || "");

      let brand_id: number | null = null;
      let model_id: number | null = null;
      let year_id: number | null = null;

      // ===== A) من filters (الرابط) =====
      const extractFromUrl = (u: URL) => {
        const company = getFilter(u, "company");
        const category = getFilter(u, "category");
        const categoryId = getFilter(u, "category_id");

        if (company && brand_id == null && brandByCompany.has(company)) brand_id = brandByCompany.get(company)!;
        if (category && model_id == null && modelByCategory.has(category)) model_id = modelByCategory.get(category)!;

        if (model_id != null && brand_id == null) brand_id = modelBrandMap.get(model_id) ?? null;

        if (categoryId && year_id == null) {
          if (model_id != null) {
            year_id = yearByModelSalla.get(`${model_id}::${categoryId}`) ?? null;
          } else {
            const cands = yearCandidatesBySalla.get(categoryId) || [];
            if (cands.length === 1) year_id = cands[0].id;
          }
        }

        // هذا اللي عندك: filters[category_id]=... ممكن يكون brand/model/year
        const catIdGeneric = u.searchParams.get("filters[category_id]");
        if (catIdGeneric) {
          if (brand_id == null && brandByCompany.has(catIdGeneric)) brand_id = brandByCompany.get(catIdGeneric)!;

          if (model_id == null && modelByCategory.has(catIdGeneric)) {
            model_id = modelByCategory.get(catIdGeneric)!;
            if (brand_id == null) brand_id = modelBrandMap.get(model_id) ?? null;
          }

          if (year_id == null) {
            if (model_id != null) {
              year_id = yearByModelSalla.get(`${model_id}::${catIdGeneric}`) ?? null;
            } else {
              const cands = yearCandidatesBySalla.get(catIdGeneric) || [];
              if (cands.length === 1) year_id = cands[0].id;
            }
          }
        }

        // ✅ إذا لقينا filters + عندنا slug: علّم النظام على هذا slug
        if (slug) {
          const c = company || catIdGeneric; // company هو الأفضل
          const m = category || null;
          const y = categoryId || null;

          if (c || m || y) {
            slugUpserts.push({
              store_id: storeId,
              slug,
              salla_company_id: c || null,
              salla_category_id: m || null,
              salla_year_id: y || null,
              updated_at: new Date().toISOString(),
            });
          }
        }
      };

      if (urlFromPage) extractFromUrl(urlFromPage);
      if (urlFromPath && (brand_id == null || model_id == null || year_id == null)) extractFromUrl(urlFromPath);

      if (model_id != null && brand_id == null) brand_id = modelBrandMap.get(model_id) ?? null;

      // ===== B) إذا ما طلع شيء من الرابط… جرّب slug hints =====
      if (brand_id == null && model_id == null && year_id == null && slug) {
        const hint = slugHints.get(slug);
        if (hint) {
          if (hint.company && brandByCompany.has(hint.company)) brand_id = brandByCompany.get(hint.company)!;
          if (hint.category && modelByCategory.has(hint.category)) model_id = modelByCategory.get(hint.category)!;

          if (model_id != null && brand_id == null) brand_id = modelBrandMap.get(model_id) ?? null;

          if (hint.year) {
            if (model_id != null) {
              year_id = yearByModelSalla.get(`${model_id}::${hint.year}`) ?? null;
            } else {
              const cands = yearCandidatesBySalla.get(hint.year) || [];
              if (cands.length === 1) year_id = cands[0].id;
            }
          }
        }
      }

      // ===== C) إذا طلع شيء من (URL/Path/SlugHints) =====
      if (brand_id != null || model_id != null || year_id != null) {
        inserts.push({
          store_id: storeId,
          visitor_id: row.visitor_id,
          salla_customer_id: null,
          brand_id,
          model_id,
          year_id,
          source: "url_guess",
          path: pathOnly || null,
          page_url: pageUrl || null,
          occurred_at: row.occurred_at,
        });
        continue;
      }

      // ===== D) منتج مباشر: من slug العربي =====
      const decodedPath = safeDecode(uPrimary.pathname || "");

      let hitModelId: number | null = null;
      for (const a of aliasList) {
        if (decodedPath.includes(a.alias)) {
          hitModelId = a.model_id;
          break;
        }
      }

      const yearMatch = decodedPath.match(/(19|20)\d{2}/);
      const yearText = yearMatch ? yearMatch[0] : null;

      if (hitModelId != null) {
        model_id = hitModelId;
        brand_id = modelBrandMap.get(model_id) ?? null;
        if (yearText) year_id = yearByModelText.get(`${model_id}::${yearText}`) ?? null;

        inserts.push({
          store_id: storeId,
          visitor_id: row.visitor_id,
          salla_customer_id: null,
          brand_id,
          model_id,
          year_id,
          source: "product",
          path: pathOnly || null,
          page_url: pageUrl || null,
          occurred_at: row.occurred_at,
        });
      }
    }

    // ✅ upsert slug hints (علّم slugs)
    if (slugUpserts.length > 0) {
      await supabase
        .from("salla_category_slug_hints")
        .upsert(slugUpserts, { onConflict: "store_id,slug" });
    }

    if (inserts.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0, reason: "no_matches" });
    }

    const { error: insErr } = await supabase
      .from("visitor_vehicle_signals")
      .insert(inserts);

    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, inserted: inserts.length, slug_hints_upserted: slugUpserts.length });
  } catch (e: any) {
    return NextResponse.json(
      { error: "SERVER_ERROR", details: String(e?.message || e) },
      { status: 500 },
    );
  }
}
