import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManageTrip, getTripAccess } from "@/lib/tripAccess";
import { createTripEvent } from "@/lib/tripEvents";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tripId } = await params;
  const access = await getTripAccess(tripId, session.user.id);
  if (!access || !canManageTrip(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (access.trip.status !== "FINALIZED") {
    return NextResponse.json(
      { error: "Finalize plan before publishing/sharing" },
      { status: 400 }
    );
  }

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { isPublic: true },
    select: { id: true, isPublic: true, shareId: true },
  });

  const origin = req.nextUrl.origin;
  await createTripEvent(
    tripId,
    "trip.published",
    { isPublic: true, shareId: updated.shareId },
    session.user.id,
    session.user.name ?? null
  );
  return NextResponse.json({
    ...updated,
    shareUrl: `${origin}/share/${updated.shareId}`,
  });
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
  const access = await getTripAccess(tripId, session.user.id);
  if (!access || !canManageTrip(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { isPublic: false },
    select: { id: true, isPublic: true, shareId: true },
  });

  await createTripEvent(
    tripId,
    "trip.unpublished",
    { isPublic: false },
    session.user.id,
    session.user.name ?? null
  );

  return NextResponse.json(updated);
}
