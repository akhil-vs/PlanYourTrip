import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const trips = await prisma.trip.findMany({
    where: { userId: session.user.id },
    include: {
      waypoints: { orderBy: { order: "asc" } },
      _count: { select: { savedPlaces: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, waypoints } = await req.json();

  const trip = await prisma.trip.create({
    data: {
      name: name || "Untitled Trip",
      description,
      userId: session.user.id,
      waypoints: {
        create: (waypoints || []).map(
          (wp: { name: string; lat: number; lng: number; order: number }) => ({
            name: wp.name,
            lat: wp.lat,
            lng: wp.lng,
            order: wp.order,
          })
        ),
      },
    },
    include: { waypoints: true },
  });

  return NextResponse.json(trip, { status: 201 });
}
