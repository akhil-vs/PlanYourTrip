export type TripRole = "OWNER" | "EDITOR" | "VIEWER";

export function canViewTrip(role: TripRole) {
  return role === "OWNER" || role === "EDITOR" || role === "VIEWER";
}

export function canEditTrip(role: TripRole) {
  return role === "OWNER" || role === "EDITOR";
}

export function canManageTrip(role: TripRole) {
  return role === "OWNER";
}
