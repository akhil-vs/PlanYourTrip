import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;

  const trip = await prisma.trip.findFirst({
    where: { shareId, isPublic: true },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      shareId: true,
      updatedAt: true,
      waypoints: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          name: true,
          notes: true,
          lat: true,
          lng: true,
          order: true,
          isLocked: true,
        },
      },
      dayPlans: {
        orderBy: { day: "asc" },
        select: {
          day: true,
          waypointIndexes: true,
          waypointIds: true,
          estimatedTravelMinutes: true,
        },
      },
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!trip) {
    return NextResponse.json({ error: "Shared trip not found" }, { status: 404 });
  }

  return NextResponse.json(trip);
}
