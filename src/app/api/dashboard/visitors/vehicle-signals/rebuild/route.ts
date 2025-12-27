import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";
import { getCurrentStoreId } from "@/lib/currentStore";

function parseUrl(s: string) {
  try {
    return new URL(s);
  } catch {
    return null;
  }
}
function extractCategorySlug(pathname: string) {
  const parts = (pathname || "").split("/").filter(Boolean);
  if (parts.length >= 2 && parts[0] === "category") return parts[1];
  return null;
}
function getFilter(u: URL, name: string) {
  return u.searchParams.get(`filters[${name}]`) || u.searchParams.get(name) || null;
}
function scoreMapRow(x: any) {
  let s = 0;
  if (x.model_id != null) s += 10;
  if (x.year_id != null) s += 5;
  if (x.brand_id != null) s += 2;
  return s;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabaseServerClient();

    // ✅ allow CRON: secret + store_id
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const storeFromQuery = url.searchParams.get("store_id");

    let storeId: string | null = null;

    if (
      secret &&
      secret === process.env.VISITOR_SIGNALS_SECRET &&
      storeFromQuery
    ) {
      storeId = storeFromQuery;
    } else {
      // ✅ admin session
      storeId = await getCurrentStoreId();
    }

    if (!storeId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = Math.min(Number(body.limit || 2000) || 2000, 20000);

    // 1) آخر زيارات
    const { data: views, error: vErr } = await supabase
      .from("visitors_page_views")
      .select("visitor_id, path, page_url, occurred_at")
      .eq("store_id", storeId)
      .order("occurred_at", { ascending: false })
      .limit(limit);

    if (vErr)
      return NextResponse.json({ error: vErr.message }, { status: 500 });

    // 2) Load mappings
    const [
      { data: brandsRows, error: bErr },
      { data: modelsRows, error: mErr },
      { data: yearsRows, error: yErr },
      { data: slugHintsRows, error: shErr },
      { data: catMapRows, error: cmErr },
    ] = await Promise.all([
      supabase
        .from("filter_brands")
        .select("id, salla_company_id")
        .eq("store_id", storeId),
      supabase
        .from("filter_models")
        .select("id, brand_id, salla_category_id")
        .eq("store_id", storeId),
      supabase
        .from("filter_years")
        .select("id, model_id, year, salla_year_id, salla_category_year_id")
        .eq("store_id", storeId),
      supabase
        .from("salla_category_slug_hints")
        .select("slug, salla_company_id, salla_category_id, salla_year_id")
        .eq("store_id", storeId),
      supabase
        .from("salla_category_vehicle_map")
        .select("salla_category_id, brand_id, model_id, year_id")
        .eq("store_id", storeId),
    ]);

    if (bErr) return NextResponse.json({ error: bErr.message }, { status: 500 });
    if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });
    if (yErr) return NextResponse.json({ error: yErr.message }, { status: 500 });
    if (shErr) return NextResponse.json({ error: shErr.message }, { status: 500 });
    if (cmErr) return NextResponse.json({ error: cmErr.message }, { status: 500 });

    // brand: company -> brand_id
    const brandByCompany = new Map<string, number>();
    (brandsRows || []).forEach((r: any) => {
      if (r?.salla_company_id)
        brandByCompany.set(String(r.salla_company_id), Number(r.id));
    });

    // model: category -> model_id + model->brand
    const modelByCategory = new Map<string, number>();
    const modelBrandMap = new Map<number, number>();
    (modelsRows || []).forEach((r: any) => {
      if (r?.salla_category_id)
        modelByCategory.set(String(r.salla_category_id), Number(r.id));
      if (r?.id != null && r?.brand_id != null)
        modelBrandMap.set(Number(r.id), Number(r.brand_id));
    });

    // year lookup by (model + salla ids) + candidates by salla id
    const yearByModelSalla = new Map<string, number>();
    const yearCandidatesBySalla = new Map<string, Array<{ id: number; model_id: number }>>();

    (yearsRows || []).forEach((r: any) => {
      const mid = Number(r.model_id);
      const id = Number(r.id);
      const sallaYear = r.salla_year_id ? String(r.salla_year_id) : null;
      const sallaCatYear = r.salla_category_year_id
        ? String(r.salla_category_year_id)
        : null;

      for (const k of [sallaYear, sallaCatYear].filter(Boolean) as string[]) {
        yearByModelSalla.set(`${mid}::${k}`, id);
        if (!yearCandidatesBySalla.has(k)) yearCandidatesBySalla.set(k, []);
        yearCandidatesBySalla.get(k)!.push({ id, model_id: mid });
      }
    });

    // slug hints
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

    // category_vehicle_map
    const vehicleBySallaCategory = new Map<
      string,
      { brand_id: number | null; model_id: number | null; year_id: number | null }
    >();
    (catMapRows || []).forEach((r: any) => {
      if (!r?.salla_category_id) return;
      vehicleBySallaCategory.set(String(r.salla_category_id), {
        brand_id: r.brand_id != null ? Number(r.brand_id) : null,
        model_id: r.model_id != null ? Number(r.model_id) : null,
        year_id: r.year_id != null ? Number(r.year_id) : null,
      });
    });

    const inserts: any[] = [];
    const slugUpserts: any[] = [];
    const catMapUpsertsRaw: any[] = [];

    for (const row of views || []) {
      const pageUrl = row.page_url ? String(row.page_url) : "";
      const pathOnly = row.path ? String(row.path) : "";

      const urlFromPage = pageUrl ? parseUrl(pageUrl) : null;
      const urlFromPath = pathOnly
        ? parseUrl(pathOnly.startsWith("http") ? pathOnly : `https://darb.com.sa${pathOnly}`)
        : null;
      const u = urlFromPage || urlFromPath;
      if (!u) continue;

      const slug = extractCategorySlug(u.pathname || "");

      let brand_id: number | null = null;
      let model_id: number | null = null;
      let year_id: number | null = null;

      const company = getFilter(u, "company");
      const category = getFilter(u, "category");
      const categoryId = getFilter(u, "category_id") || u.searchParams.get("filters[category_id]");

      // 1) إذا categoryId موجود وله mapping جاهز -> خذ الثلاثة
      if (categoryId && vehicleBySallaCategory.has(categoryId)) {
        const v = vehicleBySallaCategory.get(categoryId)!;
        if (brand_id == null && v.brand_id != null) brand_id = v.brand_id;
        if (model_id == null && v.model_id != null) model_id = v.model_id;
        if (year_id == null && v.year_id != null) year_id = v.year_id;
      }

      // 2) company/category -> ids
      if (company && brand_id == null && brandByCompany.has(company)) brand_id = brandByCompany.get(company)!;
      if (category && model_id == null && modelByCategory.has(category)) model_id = modelByCategory.get(category)!;

      if (model_id != null && brand_id == null) brand_id = modelBrandMap.get(model_id) ?? null;

      // 3) year من model+categoryId
      if (categoryId && year_id == null && model_id != null) {
        year_id = yearByModelSalla.get(`${model_id}::${categoryId}`) ?? null;
      }

      // ✅ إذا categoryId لحاله يطابق سنة واحدة فقط
      if (categoryId && (model_id == null || year_id == null)) {
        const cands = yearCandidatesBySalla.get(String(categoryId)) || [];
        if (cands.length === 1) {
          if (model_id == null) model_id = cands[0].model_id;
          if (year_id == null) year_id = cands[0].id;
          if (model_id != null && brand_id == null) brand_id = modelBrandMap.get(model_id) ?? null;
        }
      }

      // slug hints fallback
      if (brand_id == null && model_id == null && year_id == null && slug) {
        const hint = slugHints.get(slug);
        if (hint) {
          if (hint.company && brandByCompany.has(hint.company)) brand_id = brandByCompany.get(hint.company)!;
          if (hint.category && modelByCategory.has(hint.category)) model_id = modelByCategory.get(hint.category)!;
          if (model_id != null && brand_id == null) brand_id = modelBrandMap.get(model_id) ?? null;
          if (hint.year && year_id == null && model_id != null) {
            year_id = yearByModelSalla.get(`${model_id}::${hint.year}`) ?? null;
          }
        }
      }

      // ✅ تعلم slug hints (نظيف)
      if (slug && (company || category)) {
        slugUpserts.push({
          store_id: storeId,
          slug,
          salla_company_id: company || null,
          salla_category_id: category || null,
          salla_year_id: categoryId || null,
          updated_at: new Date().toISOString(),
        });
      }

      // ✅ تعلم category_vehicle_map (لازم model_id موجود)
      if (categoryId && model_id != null) {
        catMapUpsertsRaw.push({
          store_id: storeId,
          salla_category_id: String(categoryId),
          brand_id,
          model_id,
          year_id,
          created_at: new Date().toISOString(),
        });
      }

      // insert signal
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
      }
    }

    if (slugUpserts.length > 0) {
      await supabase.from("salla_category_slug_hints").upsert(slugUpserts, { onConflict: "store_id,slug" });
    }

    // ✅ Dedup mapping upserts
    const bestByCat = new Map<string, any>();
    for (const x of catMapUpsertsRaw) {
      const key = `${x.store_id}::${x.salla_category_id}`;
      const prev = bestByCat.get(key);
      if (!prev || scoreMapRow(x) > scoreMapRow(prev)) bestByCat.set(key, x);
    }
    const catMapUpserts = Array.from(bestByCat.values());

    if (catMapUpserts.length > 0) {
      const { error: upErr } = await supabase
        .from("salla_category_vehicle_map")
        .upsert(catMapUpserts, { onConflict: "store_id,salla_category_id" });
      if (upErr) {
        return NextResponse.json({ error: upErr.message, where: "cat_map_upsert" }, { status: 500 });
      }
    }

    if (inserts.length === 0) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        slug_hints_upserted: slugUpserts.length,
        cat_map_upserted: catMapUpserts.length,
        reason: "no_matches",
      });
    }

    const { error: insErr } = await supabase.from("visitor_vehicle_signals").insert(inserts);
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      inserted: inserts.length,
      slug_hints_upserted: slugUpserts.length,
      cat_map_upserted: catMapUpserts.length,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "SERVER_ERROR", details: String(e?.message || e) }, { status: 500 });
  }
}
