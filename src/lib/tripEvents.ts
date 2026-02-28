import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function createTripEvent(
  tripId: string,
  eventType: string,
  payload: unknown,
  actorId?: string,
  actorName?: string | null
) {
  const normalizedPayload: Record<string, unknown> =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? { ...(payload as Record<string, unknown>) }
      : { value: payload };

  if (actorName && !normalizedPayload.actorName) {
    normalizedPayload.actorName = actorName;
  }

  return prisma.tripChangeEvent.create({
    data: {
      tripId,
      eventType,
      payload: normalizedPayload as Prisma.InputJsonValue,
      actorId: actorId || null,
    },
  });
}
