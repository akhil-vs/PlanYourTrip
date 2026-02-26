import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "10000";
  const kinds = searchParams.get("kinds") || "interesting_places";

  if (!lat || !lng) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  const apiKey = process.env.OPENTRIPMAP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenTripMap API key not configured" },
      { status: 500 }
    );
  }

  try {
    const params = new URLSearchParams({
      radius,
      lon: lng,
      lat,
      kinds,
      rate: "2",
      format: "json",
      limit: "50",
      apikey: apiKey,
    });

    const res = await fetch(
      `https://api.opentripmap.com/0.1/en/places/radius?${params}`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "OpenTripMap request failed" },
        { status: res.status }
      );
    }

    const data = await res.json();

    const pois = (data || []).map(
      (p: {
        xid: string;
        name: string;
        point: { lon: number; lat: number };
        kinds: string;
        rate: number;
      }) => ({
        id: p.xid,
        name: p.name || "Unnamed Place",
        lat: p.point.lat,
        lng: p.point.lon,
        category: "attraction",
        subcategory: p.kinds?.split(",")[0] || "",
        rating: p.rate || 0,
        source: "opentripmap",
      })
    ).filter((p: { name: string }) => p.name && p.name !== "Unnamed Place");

    return NextResponse.json(pois);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch attractions" },
      { status: 500 }
    );
  }
}
