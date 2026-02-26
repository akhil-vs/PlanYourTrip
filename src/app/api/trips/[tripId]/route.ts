import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: session.user.id },
    include: {
      waypoints: { orderBy: { order: "asc" } },
      savedPlaces: true,
    },
  });

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;
  const { name, description, waypoints } = await req.json();

  const existing = await prisma.trip.findFirst({
    where: { id: tripId, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  // Delete existing waypoints and recreate
  await prisma.waypoint.deleteMany({ where: { tripId } });

  const trip = await prisma.trip.update({
    where: { id: tripId },
    data: {
      name: name || existing.name,
      description: description !== undefined ? description : existing.description,
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
    include: { waypoints: { orderBy: { order: "asc" } } },
  });

  return NextResponse.json(trip);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;

  const existing = await prisma.trip.findFirst({
    where: { id: tripId, userId: session.user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  await prisma.trip.delete({ where: { id: tripId } });

  return NextResponse.json({ success: true });
}
