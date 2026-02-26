import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q");
  if (!q) {
    return NextResponse.json([], { status: 200 });
  }

  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Mapbox token not configured" },
      { status: 500 }
    );
  }

  const sessionToken = searchParams.get("session_token") || crypto.randomUUID();

  const params = new URLSearchParams({
    q,
    access_token: token,
    session_token: sessionToken,
    limit: searchParams.get("limit") || "8",
    language: searchParams.get("language") || "en",
  });

  const proximity = searchParams.get("proximity");
  if (proximity) params.set("proximity", proximity);

  const url = `https://api.mapbox.com/search/searchbox/v1/suggest?${params}`;
  const res = await fetch(url);

  if (!res.ok) {
    const errorBody = await res.text();
    console.error("Mapbox suggest failed:", res.status, errorBody);
    return NextResponse.json(
      { error: "Search failed", detail: errorBody },
      { status: res.status }
    );
  }

  const data = await res.json();

  const results = await Promise.all(
    (data.suggestions || [])
      .filter(
        (s: { mapbox_id?: string }) => s.mapbox_id
      )
      .slice(0, 8)
      .map(async (s: { mapbox_id: string; name: string; full_address?: string; place_formatted?: string }) => {
        const retrieveRes = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/retrieve/${s.mapbox_id}?access_token=${token}&session_token=${sessionToken}`
        );
        if (!retrieveRes.ok) return null;
        const retrieveData = await retrieveRes.json();
        const feature = retrieveData.features?.[0];
        if (!feature) return null;

        return {
          id: s.mapbox_id,
          name: s.name,
          fullName: s.full_address || s.place_formatted || s.name,
          lng: feature.geometry.coordinates[0],
          lat: feature.geometry.coordinates[1],
        };
      })
  );

  return NextResponse.json(results.filter(Boolean));
}
