import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Activity, RefreshCw } from "lucide-react";
import { admin, workspace } from "../../app/runtime";
import {
  Button,
  EmptyState,
  ErrorPanel,
  Field,
  PageHeading,
  Spinner,
} from "../../shared/ui";
import { t as tr, useLanguage } from "../../shared/i18n";
import { dateTime } from "../../shared/utils";
import type { DeliveryStatus } from "../../domain/models";

const statuses: Record<DeliveryStatus, string> = {
  pending: "Pending",
  retrying: "Retrying",
  leased: "In progress",
  sent: "Sent",
  abandoned: "Abandoned",
};

export default function ReminderDeliveries() {
  useLanguage();
  const [filters, setFilters] = useState({
    userId: "",
    status: "",
    from: "",
    to: "",
  });
  const [applied, setApplied] = useState(filters);
  const [page, setPage] = useState(1);
  const result = useQuery({
    queryKey: workspace.key("admin-deliveries", page, applied),
    queryFn: () =>
      admin.deliveries(page, {
        userId: applied.userId || undefined,
        status: (applied.status || undefined) as DeliveryStatus | undefined,
        from: applied.from ? new Date(applied.from).toISOString() : undefined,
        to: applied.to ? new Date(applied.to).toISOString() : undefined,
      }),
  });
  return (
    <>
      <PageHeading
        title={tr("Reminder deliveries")}
        description={tr(
          "Delivery records only. Sent means accepted by the provider; worker health and mailbox arrival are not confirmed.",
        )}
      >
        <Button
          variant="secondary"
          busy={result.isFetching}
          onClick={() => void result.refetch()}
        >
          <RefreshCw size={16} />
          {tr("Refresh")}
        </Button>
      </PageHeading>
      <form
        className="table-toolbar delivery-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setApplied({ ...filters, userId: filters.userId.trim() });
          setPage(1);
        }}
      >
        <Field label={tr("Target account ID")}>
          <input
            value={filters.userId}
            onChange={(event) =>
              setFilters({ ...filters, userId: event.target.value })
            }
            pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
            title={tr("Enter a complete account ID (UUID).")}
          />
        </Field>
        <Field label={tr("Delivery status")}>
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters({ ...filters, status: event.target.value })
            }
          >
            <option value="">{tr("All statuses")}</option>
            {Object.entries(statuses).map(([value, label]) => (
              <option key={value} value={value}>
                {tr(label)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tr("Occurrence from")}>
          <input
            type="datetime-local"
            value={filters.from}
            onChange={(event) =>
              setFilters({ ...filters, from: event.target.value })
            }
          />
        </Field>
        <Field label={tr("Occurrence before")}>
          <input
            type="datetime-local"
            min={filters.from || undefined}
            value={filters.to}
            onChange={(event) =>
              setFilters({ ...filters, to: event.target.value })
            }
          />
        </Field>
        <Button type="submit">{tr("Apply filters")}</Button>
        <Button
          variant="secondary"
          onClick={() => {
            const empty = { userId: "", status: "", from: "", to: "" };
            setFilters(empty);
            setApplied(empty);
            setPage(1);
          }}
        >
          {tr("Clear filters")}
        </Button>
      </form>
      {result.isPending ? (
        <Spinner />
      ) : result.isError ? (
        <ErrorPanel error={result.error} retry={() => void result.refetch()} />
      ) : (
        <>
          <div className="table-wrap">
          <table className="audit-table delivery-table">
              <thead>
                <tr>
                  {[
                    "Delivery ID",
                    "Target account",
                    "Delivery status",
                    "Attempts",
                    "Occurrence",
                    "Next attempt",
                    "Last attempt",
                    "Sent",
                    "Abandoned at",
                    "Lease until",
                    "Error code",
                  ].map((label) => (
                    <th key={label}>{tr(label)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.data.items.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>
                      <code>{delivery.id}</code>
                    </td>
                    <td>
                      <Link to={`/admin/audit?targetUserId=${delivery.userId}`}>
                        <code>{delivery.userId}</code>
                      </Link>
                    </td>
                    <td>{tr(statuses[delivery.status])}</td>
                    <td>{delivery.attempts}</td>
                    <td>{dateTime(delivery.occurrenceAt)}</td>
                    <td>
                      {delivery.status === "sent" ||
                      delivery.status === "abandoned"
                        ? "—"
                        : dateTime(delivery.nextAttemptAt)}
                    </td>
                    <td>
                      {delivery.lastAttemptAt
                        ? dateTime(delivery.lastAttemptAt)
                        : "—"}
                    </td>
                    <td>{delivery.sentAt ? dateTime(delivery.sentAt) : "—"}</td>
                    <td>
                      {delivery.abandonedAt
                        ? dateTime(delivery.abandonedAt)
                        : "—"}
                    </td>
                    <td>
                      {delivery.leaseUntil
                        ? dateTime(delivery.leaseUntil)
                        : "—"}
                    </td>
                    <td>
                      <code>{delivery.errorCode ?? "—"}</code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!result.data.items.length && (
              <EmptyState
                icon={Activity}
                title={tr("No matching deliveries")}
                description={tr("Try another account, status or time range.")}
              />
            )}
          </div>
          <div className="pager">
            <span>
              {tr("Page")} {page}
            </span>
            <Button
              variant="secondary"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              {tr("Previous")}
            </Button>
            <Button
              variant="secondary"
              disabled={!result.data.hasNextPage}
              onClick={() => setPage(page + 1)}
            >
              {tr("Next")}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
