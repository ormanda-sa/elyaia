// src/app/api/widgets/route.ts
import { NextResponse } from "next/server";

// مبدئياً: نرجّع ودجت واحد ثابت للفلتر
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const storeId = searchParams.get("store_id");

  // لو حاب، هنا تقدر تتأكد من storeId، الآن بنرجع نفس الودجت لكل ستور
  const widget = {
    id: 1,
    store_id: storeId,
    kind: "filter_bar",
    template: "filter_hero_v1",
    config: {
      hero: {
        title: "ابحث عن قطع غيار سيارتك",
        subtitle:
          "181,825 قطعة غيار لجميع سيارات تويوتا الأصلية واليابانية والتجارية",
        backgroundImageUrl:
          "https://static.darb.com.sa/hero-bg/shocks.webp",
        counterTarget: 181825
      },
      filterPlacement: {
        mode: "under_header",
        selector: "header"
      },
      search: {
        maxParts: 5
      }
    }
  };

  const json = {
    ok: true,
    data: {
      widgets: [widget]
    }
  };

  return NextResponse.json(json, {
    status: 200,
    headers: {
      "cache-control": "no-store"
    }
  });
}
