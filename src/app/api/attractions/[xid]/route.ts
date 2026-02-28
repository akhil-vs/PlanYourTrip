import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ xid: string }> }
) {
  const { xid } = await params;
  const apiKey = process.env.OPENTRIPMAP_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenTripMap API key not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(
      `https://api.opentripmap.com/0.1/en/places/xid/${xid}?apikey=${apiKey}`
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch details" },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json({
      id: data.xid,
      name: data.name || "Unnamed Place",
      description:
        data.wikipedia_extracts?.text ||
        data.info?.descr ||
        "",
      image: data.preview?.source || data.image || "",
      url: data.wikipedia || data.url || "",
      address: [
        data.address?.road,
        data.address?.city || data.address?.town || data.address?.village,
        data.address?.state,
        data.address?.country,
      ]
        .filter(Boolean)
        .join(", "),
      lat: data.point?.lat,
      lng: data.point?.lon,
      kinds: data.kinds || "",
      rating: data.rate || 0,
      openingHours:
        typeof data.opening_hours === "string"
          ? data.opening_hours
          : data.opening_hours?.hours || "",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch details" },
      { status: 500 }
    );
  }
}
