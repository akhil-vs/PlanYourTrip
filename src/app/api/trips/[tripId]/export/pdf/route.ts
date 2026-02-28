import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canViewTrip, getTripAccess } from "@/lib/tripAccess";
import { buildSimplePdf } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { tripId } = await params;
  const access = await getTripAccess(tripId, session.user.id);
  if (!access || !canViewTrip(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (access.trip.status !== "FINALIZED") {
    return NextResponse.json(
      { error: "Trip must be finalized before PDF export" },
      { status: 400 }
    );
  }

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      user: { select: { name: true, email: true } },
      members: { include: { user: { select: { name: true, email: true } } } },
      waypoints: { orderBy: { order: "asc" } },
      dayPlans: { orderBy: { day: "asc" } },
    },
  });
  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const lines: string[] = [];
  lines.push(`Status: ${trip.status} ${trip.isPublic ? "(Published)" : ""}`);
  lines.push(`Owner: ${trip.user.name} <${trip.user.email}>`);
  lines.push(`Collaborators: ${trip.members.length}`);
  lines.push(`Created: ${trip.createdAt.toISOString()}`);
  lines.push(`Updated: ${trip.updatedAt.toISOString()}`);
  lines.push("");
  lines.push("Route Summary");
  lines.push(`Waypoints: ${trip.waypoints.length}`);
  lines.push(`Day Plans: ${trip.dayPlans.length}`);
  lines.push("");
  lines.push("Collaborators");
  for (const member of trip.members) {
    lines.push(`- ${member.user.name} <${member.user.email}> (${member.role})`);
  }
  lines.push("");
  lines.push("Day-wise Itinerary");

  const waypointById = new Map(trip.waypoints.map((wp) => [wp.id, wp]));
  trip.dayPlans.forEach((day) => {
    lines.push(`Day ${day.day}`);
    lines.push(`Travel Minutes: ${day.estimatedTravelMinutes}`);
    const ids =
      day.waypointIds.length > 0
        ? day.waypointIds
        : day.waypointIndexes.map((idx) => trip.waypoints[idx]?.id).filter(Boolean);
    if (ids.length === 0) {
      lines.push("- No stops");
      lines.push("");
      return;
    }
    ids.forEach((id, index) => {
      const wp = waypointById.get(id);
      if (!wp) return;
      const timing = `${Math.floor(wp.openMinutes / 60)
        .toString()
        .padStart(2, "0")}:${(wp.openMinutes % 60)
        .toString()
        .padStart(2, "0")} - ${Math.floor(wp.closeMinutes / 60)
        .toString()
        .padStart(2, "0")}:${(wp.closeMinutes % 60).toString().padStart(2, "0")}`;
      lines.push(`${index + 1}. ${wp.name}`);
      lines.push(`   Visit: ${wp.visitMinutes} min | Open: ${timing}`);
      lines.push(`   Notes: ${wp.notes?.trim() || "-"}`);
      lines.push("   Map: [snapshot placeholder]");
    });
    lines.push("");
  });

  const pdfBuffer = buildSimplePdf(`${trip.name} - Itinerary`, lines);
  return new Response(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${trip.name
        .replace(/[^a-z0-9]+/gi, "-")
        .toLowerCase()}-itinerary.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
