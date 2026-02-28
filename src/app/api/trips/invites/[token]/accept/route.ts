import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createTripEvent } from "@/lib/tripEvents";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const invite = await prisma.tripInvite.findUnique({
    where: { token },
  });
  if (!invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }
  if (invite.status !== "PENDING") {
    return NextResponse.json({ error: "Invite is no longer valid" }, { status: 400 });
  }
  if (invite.expiresAt < new Date()) {
    await prisma.tripInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Invite expired" }, { status: 400 });
  }
  if (invite.email.toLowerCase() !== session.user.email.toLowerCase()) {
    return NextResponse.json({ error: "Invite email mismatch" }, { status: 403 });
  }

  await prisma.tripMember.upsert({
    where: { tripId_userId: { tripId: invite.tripId, userId: session.user.id } },
    update: { role: invite.role },
    create: { tripId: invite.tripId, userId: session.user.id, role: invite.role },
  });
  await prisma.tripInvite.update({
    where: { id: invite.id },
    data: { status: "ACCEPTED", acceptedAt: new Date() },
  });
  await createTripEvent(
    invite.tripId,
    "trip.invite.accepted",
    { inviteId: invite.id, userId: session.user.id, role: invite.role },
    session.user.id,
    session.user.name ?? null
  );

  return NextResponse.json({ success: true, tripId: invite.tripId, role: invite.role });
}
