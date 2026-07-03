import type { LeaveRequestResponse, LeaveStatus, LeaveType } from "@/api/generated/types.gen";

export type StatusTone = "danger" | "info" | "neutral" | "success" | "warning";

export function approvalStatusTone(status: LeaveStatus): StatusTone {
  const tones: Record<LeaveStatus, StatusTone> = {
    approved: "success",
    cancelled: "neutral",
    pending: "warning",
    rejected: "danger",
  };
  return tones[status];
}

export function approvalStatusLabel(status: LeaveStatus): string {
  const labels: Record<LeaveStatus, string> = {
    approved: "Approved",
    cancelled: "Cancelled",
    pending: "Pending",
    rejected: "Rejected",
  };
  return labels[status];
}

export function leaveTypeLabel(type: LeaveType): string {
  const labels: Record<LeaveType, string> = {
    ANNUAL: "Annual",
    BEREAVEMENT: "Bereavement",
    EXCUSE: "Excuse",
    MARRIAGE: "Marriage",
    SICK: "Sick",
    UNPAID: "Unpaid",
  };
  return labels[type];
}

export function formatRequestAge(createdAt: string, now: Date = new Date()): string {
  const createdTime = new Date(createdAt).getTime();
  const diffMs = Math.max(0, now.getTime() - createdTime);
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) {
    return `${Math.max(1, minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

export function matchesApprovalSearch(
  request: LeaveRequestResponse,
  requesterName: string | undefined,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return true;
  }
  return [
    request.id,
    request.employee_id,
    request.status,
    request.type,
    requesterName,
    leaveTypeLabel(request.type),
  ].some((value) => value?.toLowerCase().includes(normalized));
}
