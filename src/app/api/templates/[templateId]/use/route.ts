import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templateId } = await params;

  const template = await prisma.tripTemplate.findFirst({
    where: { id: templateId, userId: session.user.id },
    include: { waypoints: { orderBy: { order: "asc" } } },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const trip = await prisma.trip.create({
    data: {
      name: template.name.replace(/ Template$/, ""),
      description: template.description,
      userId: session.user.id,
      waypoints: {
        create: template.waypoints.map((wp) => ({
          name: wp.name,
          lat: wp.lat,
          lng: wp.lng,
          order: wp.order,
        })),
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  return NextResponse.json(trip, { status: 201 });
}
