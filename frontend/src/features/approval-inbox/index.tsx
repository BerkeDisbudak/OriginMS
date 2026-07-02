"use client";

import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApprovalInboxApiProvider,
  useApprovalInboxCurrentUser,
  useApprovalInboxEmployee,
  useApprovalInboxEmployees,
  useApprovalInboxLeaveBalance,
  useApprovalInboxRequest,
  useApprovalInboxRequests,
  useApproveLeaveRequest,
  useDemoManagerSession,
  useRejectLeaveRequest,
} from "@/api/approval-inbox";
import type { LeaveRequestPage, LeaveRequestResponse } from "@/api/generated/types.gen";
import {
  approvalStatusLabel,
  approvalStatusTone,
  formatRequestAge,
  leaveTypeLabel,
  matchesApprovalSearch,
  moveSelection,
  problemDetail,
  problemFieldMessage,
} from "@/domain/approval-inbox";
import { cn } from "@/lib/cn";
import {
  Button,
  Input,
  StatusPill,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from "@/ui";

type PendingAction = {
  id: string;
  type: "approve" | "reject";
};

export function ApprovalInboxPage() {
  return (
    <ApprovalInboxApiProvider>
      <ApprovalInboxShell />
    </ApprovalInboxApiProvider>
  );
}

function ApprovalInboxShell() {
  const session = useDemoManagerSession();
  const isReady = session.tokenReady;
  const currentUser = useApprovalInboxCurrentUser(isReady);
  const [cursor, setCursor] = useState<string | null>(null);
  const [pages, setPages] = useState<LeaveRequestPage[]>([]);
  const requests = useApprovalInboxRequests(isReady, "pending", cursor);
  const [search, setSearch] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const allRequests = useMemo(() => pages.flatMap((page) => page.items), [pages]);
  const employeeLookup = useApprovalInboxEmployees(
    allRequests.map((request) => request.employee_id),
    isReady && allRequests.length > 0,
  );
  const filteredRequests = useMemo(
    () =>
      allRequests.filter((request) =>
        matchesApprovalSearch(
          request,
          employeeDisplayName(employeeLookup[request.employee_id], undefined),
          search,
        ),
      ),
    [allRequests, employeeLookup, search],
  );

  const selectedRequest = useMemo(() => {
    if (!filteredRequests.length) {
      return undefined;
    }
    return filteredRequests.find((request) => request.id === selectedId) ?? filteredRequests[0];
  }, [filteredRequests, selectedId]);

  useEffect(() => {
    if (!requests.data) {
      return;
    }
    const page = requests.data;
    setPages((currentPages) => {
      if (!cursor) {
        return [page];
      }
      if (
        currentPages.some((itemPage) =>
          itemPage.items.some((item) => item.id === page.items[0]?.id),
        )
      ) {
        return currentPages;
      }
      return [...currentPages, page];
    });
  }, [cursor, requests.data]);

  useEffect(() => {
    if (selectedRequest && selectedRequest.id !== selectedId) {
      setSelectedId(selectedRequest.id);
    }
  }, [selectedId, selectedRequest]);

  useEffect(() => {
    if (activeIndex >= filteredRequests.length) {
      setActiveIndex(Math.max(0, filteredRequests.length - 1));
    }
  }, [activeIndex, filteredRequests.length]);

  const selectByIndex = useCallback(
    (nextIndex: number) => {
      const request = filteredRequests[nextIndex];
      if (!request) {
        return;
      }
      setActiveIndex(nextIndex);
      setSelectedId(request.id);
      setInlineError(null);
    },
    [filteredRequests],
  );

  const moveActive = useCallback(
    (direction: 1 | -1) => {
      const nextIndex = moveSelection(activeIndex, direction, filteredRequests.length);
      selectByIndex(nextIndex);
    },
    [activeIndex, filteredRequests.length, selectByIndex],
  );

  const selectedIndex = filteredRequests.findIndex((request) => request.id === selectedRequest?.id);
  const approveMutation = useApproveLeaveRequest();
  const rejectMutation = useRejectLeaveRequest();

  const approveSelected = useCallback(async () => {
    if (!selectedRequest || pendingAction) {
      return;
    }
    setInlineError(null);
    setPendingAction({ id: selectedRequest.id, type: "approve" });
    try {
      await approveMutation.mutateAsync({
        path: {
          leave_request_id: selectedRequest.id,
        },
      });
      showToast({ title: "Approved", tone: "success" });
      selectByIndex(Math.min(selectedIndex + 1, filteredRequests.length - 1));
    } catch (error) {
      setInlineError(problemDetail(error));
    } finally {
      setPendingAction(null);
    }
  }, [
    approveMutation,
    filteredRequests.length,
    pendingAction,
    selectByIndex,
    selectedIndex,
    selectedRequest,
    showToast,
  ]);

  const rejectSelected = useCallback(
    async (reason: string) => {
      if (!selectedRequest || pendingAction) {
        return;
      }
      setInlineError(null);
      setPendingAction({ id: selectedRequest.id, type: "reject" });
      try {
        await rejectMutation.mutateAsync({
          body: { reason },
          path: {
            leave_request_id: selectedRequest.id,
          },
        });
        setRejectOpen(false);
        showToast({ title: "Rejected", tone: "success" });
        selectByIndex(Math.min(selectedIndex + 1, filteredRequests.length - 1));
      } catch (error) {
        setInlineError(problemFieldMessage(error, "reason") ?? problemDetail(error));
      } finally {
        setPendingAction(null);
      }
    },
    [
      filteredRequests.length,
      pendingAction,
      rejectMutation,
      selectByIndex,
      selectedIndex,
      selectedRequest,
      showToast,
    ],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target;
      const isTextInput =
        target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;

      if (event.key === "/" && !isTextInput) {
        event.preventDefault();
        focusInput("approval-search");
        return;
      }
      if (isTextInput && event.key !== "Escape") {
        return;
      }
      if (isTextInput && event.key === "Escape") {
        event.preventDefault();
        setRejectOpen(false);
        target.blur();
        return;
      }
      if (event.key === "j" || event.key === "ArrowDown") {
        event.preventDefault();
        moveActive(1);
        return;
      }
      if (event.key === "k" || event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(-1);
        return;
      }
      if (event.key === "Enter") {
        detailRef.current?.focus();
        return;
      }
      if (event.key === "a") {
        event.preventDefault();
        void approveSelected();
        return;
      }
      if (event.key === "r") {
        event.preventDefault();
        setRejectOpen(true);
        return;
      }
      if (event.key === "Escape") {
        setRejectOpen(false);
        detailRef.current?.focus();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [approveSelected, moveActive]);

  const isLoading = session.isPending || (isReady && requests.isPending);
  const error = session.error ?? currentUser.error ?? requests.error;

  return (
    <main className="min-h-screen bg-bg p-6 text-text-primary">
      <section className="mx-auto grid min-h-[calc(100vh-var(--space-12))] max-w-[1200px] gap-6 lg:grid-cols-[25rem_minmax(0,1fr)]">
        <ApprovalInboxList
          activeId={selectedRequest?.id}
          employeeLookup={employeeLookup}
          error={error ? problemDetail(error) : null}
          hasNextPage={Boolean(pages.at(-1)?.page.next_cursor)}
          isFetchingNextPage={requests.isFetching && Boolean(cursor)}
          isLoading={isLoading}
          items={filteredRequests}
          onLoadMore={() => {
            const nextCursor = pages.at(-1)?.page.next_cursor;
            if (nextCursor) {
              setCursor(nextCursor);
            }
          }}
          onSearchChange={setSearch}
          onSelect={(request) => {
            const nextIndex = filteredRequests.findIndex((item) => item.id === request.id);
            selectByIndex(nextIndex);
          }}
          pendingAction={pendingAction}
          search={search}
          userLabel={currentUser.data?.email ?? "Signing in"}
        />
        <ApprovalInboxDetail
          inlineError={inlineError}
          isRejectOpen={rejectOpen}
          onApprove={() => void approveSelected()}
          onReject={(reason) => void rejectSelected(reason)}
          onRejectOpenChange={setRejectOpen}
          pendingAction={pendingAction}
          refTarget={detailRef}
          request={selectedRequest}
        />
      </section>
    </main>
  );
}

function ApprovalInboxList({
  activeId,
  employeeLookup,
  error,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  items,
  onLoadMore,
  onSearchChange,
  onSelect,
  pendingAction,
  search,
  userLabel,
}: {
  activeId: string | undefined;
  employeeLookup: Record<string, ReturnType<typeof useApprovalInboxEmployees>[string]>;
  error: string | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  items: LeaveRequestResponse[];
  onLoadMore: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (request: LeaveRequestResponse) => void;
  pendingAction: PendingAction | null;
  search: string;
  userLabel: string;
}) {
  const showSkeleton = useDelayedVisibility(isLoading, 200);

  return (
    <div className="min-w-0 rounded-card border border-border bg-surface">
      <div className="grid gap-4 border-b border-border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-meta font-medium tracking-label text-text-tertiary uppercase">
              Approval Inbox
            </p>
            <h1 className="mt-1 text-page font-semibold leading-heading">Pending leave</h1>
          </div>
          <p className="text-right text-meta text-text-secondary">{userLabel}</p>
        </div>
        <Input
          label="Search"
          name="approval-search"
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Requester, type, status"
          value={search}
        />
      </div>
      {error ? <InlineError message={error} /> : null}
      {showSkeleton ? <ApprovalInboxSkeleton /> : null}
      {!isLoading && !error ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requester</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Age</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length ? (
              items.map((request) => {
                const requester =
                  employeeDisplayName(employeeLookup[request.employee_id], request.employee_id) ??
                  request.employee_id;
                return (
                  <ApprovalInboxRow
                    active={request.id === activeId}
                    employeeName={requester}
                    key={request.id}
                    onSelect={() => onSelect(request)}
                    pending={pendingAction?.id === request.id}
                    request={request}
                  />
                );
              })
            ) : (
              <tr>
                <TableEmpty colSpan={3}>No pending approvals</TableEmpty>
              </tr>
            )}
          </TableBody>
        </Table>
      ) : null}
      <div className="border-t border-border p-4">
        <Button disabled={!hasNextPage || isFetchingNextPage} onClick={onLoadMore} size="sm">
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      </div>
    </div>
  );
}

function ApprovalInboxRow({
  active,
  employeeName,
  onSelect,
  pending,
  request,
}: {
  active: boolean;
  employeeName: string;
  onSelect: () => void;
  pending: boolean;
  request: LeaveRequestResponse;
}) {
  return (
    <TableRow
      aria-selected={active}
      className={cn(
        "cursor-pointer border-l-2 border-l-transparent",
        active ? "bg-surface-raised" : "",
        pending ? "border-l-accent opacity-60" : "",
      )}
      onClick={onSelect}
      tabIndex={0}
    >
      <TableCell>
        <div className="grid gap-1">
          <span className="font-medium">{employeeName}</span>
          <span className="font-mono text-meta text-text-tertiary">{request.employee_id}</span>
        </div>
      </TableCell>
      <TableCell>
        <div className="grid gap-2">
          <span>{leaveTypeLabel(request.type)}</span>
          <StatusPill
            compact
            label={approvalStatusLabel(request.status)}
            tone={approvalStatusTone(request.status)}
          />
        </div>
      </TableCell>
      <TableCell className="font-mono tabular-nums text-text-secondary">
        {formatRequestAge(request.created_at)}
      </TableCell>
    </TableRow>
  );
}

function ApprovalInboxDetail({
  inlineError,
  isRejectOpen,
  onApprove,
  onReject,
  onRejectOpenChange,
  pendingAction,
  refTarget,
  request,
}: {
  inlineError: string | null;
  isRejectOpen: boolean;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRejectOpenChange: (open: boolean) => void;
  pendingAction: PendingAction | null;
  refTarget: RefObject<HTMLDivElement | null>;
  request: LeaveRequestResponse | undefined;
}) {
  const detail = useApprovalInboxRequest(request?.id, Boolean(request));
  const resolvedRequest = detail.data ?? request;
  const employee = useApprovalInboxEmployee(resolvedRequest?.employee_id, Boolean(resolvedRequest));
  const balance = useApprovalInboxLeaveBalance(
    resolvedRequest?.employee_id,
    Boolean(resolvedRequest),
  );

  if (!resolvedRequest) {
    return (
      <section className="rounded-card border border-border bg-surface p-6">
        <p className="text-base text-text-secondary">Select a request</p>
      </section>
    );
  }

  const isPending = pendingAction?.id === resolvedRequest.id;
  const requester = employeeDisplayName(employee.data, resolvedRequest.employee_id);

  return (
    <section
      className={cn(
        "min-w-0 rounded-card border border-border bg-surface p-6",
        isPending ? "border-l-2 border-l-accent opacity-60" : "",
      )}
      ref={refTarget}
      tabIndex={-1}
    >
      <div className="flex items-start justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-meta font-medium tracking-label text-text-tertiary uppercase">
            Request detail
          </p>
          <h2 className="mt-2 text-section font-semibold leading-heading">{requester}</h2>
          <p className="mt-1 text-base text-text-secondary">
            {leaveTypeLabel(resolvedRequest.type)} leave, {resolvedRequest.business_days} business
            days
          </p>
        </div>
        <StatusPill
          label={approvalStatusLabel(resolvedRequest.status)}
          tone={approvalStatusTone(resolvedRequest.status)}
        />
      </div>
      <div className="grid gap-5 py-5 md:grid-cols-2">
        <SummaryBlock
          label="Dates"
          value={`${resolvedRequest.start_date} to ${resolvedRequest.end_date}`}
        />
        <SummaryBlock
          label="Requested"
          value={`${formatRequestAge(resolvedRequest.created_at)} ago`}
        />
        <SummaryBlock label="Role" value={employee.data?.title ?? "Loading"} />
        <SummaryBlock
          label="Balance"
          value={
            balance.data
              ? `${balance.data.remaining} remaining, ${balance.data.pending_days} pending`
              : "Loading"
          }
        />
      </div>
      <div className="border-t border-border py-5">
        <p className="text-meta font-medium text-text-secondary">Requester note</p>
        <p className="mt-2 text-base leading-body text-text-primary">
          {resolvedRequest.note || "No note provided."}
        </p>
      </div>
      {inlineError ? <InlineError message={inlineError} /> : null}
      {isRejectOpen ? (
        <ApprovalInboxRejectComposer
          disabled={Boolean(pendingAction)}
          onCancel={() => onRejectOpenChange(false)}
          onReject={onReject}
        />
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
        <Button
          disabled={Boolean(pendingAction)}
          loading={pendingAction?.id === resolvedRequest.id && pendingAction.type === "approve"}
          onClick={onApprove}
          variant="primary"
        >
          {pendingAction?.id === resolvedRequest.id && pendingAction.type === "approve"
            ? "Approving..."
            : "Approve"}
        </Button>
        <Button
          disabled={Boolean(pendingAction)}
          loading={pendingAction?.id === resolvedRequest.id && pendingAction.type === "reject"}
          onClick={() => onRejectOpenChange(true)}
          variant="danger"
        >
          {pendingAction?.id === resolvedRequest.id && pendingAction.type === "reject"
            ? "Rejecting..."
            : "Reject"}
        </Button>
      </div>
    </section>
  );
}

function ApprovalInboxRejectComposer({
  disabled,
  onCancel,
  onReject,
}: {
  disabled: boolean;
  onCancel: () => void;
  onReject: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const error = touched && reason.trim().length < 5 ? "Reason must be at least 5 characters." : "";
  useEffect(() => {
    focusInput("reject-reason");
  }, []);

  return (
    <div className="grid gap-3 rounded-card border border-border bg-surface-raised p-4">
      <Input
        error={error || undefined}
        label="Reject reason"
        name="reject-reason"
        onBlur={() => setTouched(true)}
        onChange={(event) => setReason(event.target.value)}
        value={reason}
      />
      <div className="flex gap-3">
        <Button
          disabled={disabled || reason.trim().length < 5}
          onClick={() => {
            setTouched(true);
            if (reason.trim().length >= 5) {
              onReject(reason.trim());
            }
          }}
          size="sm"
          variant="danger"
        >
          Submit rejection
        </Button>
        <Button disabled={disabled} onClick={onCancel} size="sm" variant="ghost">
          Cancel
        </Button>
      </div>
    </div>
  );
}

function ApprovalInboxSkeleton() {
  return (
    <div className="grid gap-3 p-4" role="status">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          className="h-11 animate-pulse rounded-control bg-surface-raised"
          key={`approval-skeleton-${index}`}
        />
      ))}
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <p
      className="m-4 rounded-control border border-danger/40 bg-danger/10 p-3 text-base text-text-primary"
      role="alert"
    >
      {message}
    </p>
  );
}

function SummaryBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-3">
      <p className="text-meta font-medium tracking-label text-text-tertiary uppercase">{label}</p>
      <p className="mt-2 text-base text-text-primary">{value}</p>
    </div>
  );
}

function employeeName(employee: { first_name: string; last_name: string }) {
  return `${employee.first_name} ${employee.last_name}`;
}

function employeeDisplayName(
  employee: { first_name: string; last_name: string } | undefined,
  fallback: string | undefined,
) {
  return employee ? employeeName(employee) : fallback;
}

function focusInput(id: string) {
  const input = document.getElementById(id);
  if (input instanceof HTMLInputElement) {
    input.focus();
  }
}

function useDelayedVisibility(active: boolean, delayMs: number) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }
    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return visible;
}
