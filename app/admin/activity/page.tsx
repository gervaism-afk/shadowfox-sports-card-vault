"use client";
import { useEffect, useState } from "react";
import { adminRequest } from "@/lib/admin-request";
import {
  ACTIVITY_LABELS,
  activityCsv,
  activityDetail,
  type AdminActivity,
} from "@/lib/admin-activity";
export default function AdminActivityPage() {
  const [events, setEvents] = useState<AdminActivity[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [kind, setKind] = useState(""),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setEvents([]);
    adminRequest(`/api/admin/activity?page=${page}&kind=${kind}`)
      .then((data) => {
        if (active) {
          setEvents(data.events);
          setTotal(data.total);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, kind, reload]);
  function download() {
    const url = URL.createObjectURL(
      new Blob([activityCsv(events)], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `shadowfox-admin-activity-page-${page}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const pages = Math.max(1, Math.ceil(total / 25));
  return (
    <div className="sfAdminShell">
      <div className="sfAdminTop">
        <div>
          <h1 className="sfPageTitle">Activity history</h1>
          <p className="vaultWelcomeCopy">
            See who edited cards, changed user roles or saved site content.
          </p>
        </div>
        <div className="buttonRow">
          <button
            className="btn ghost"
            disabled={loading}
            onClick={() => setReload((n) => n + 1)}
          >
            Refresh activity
          </button>
          <button
            className="btn ghost"
            disabled={loading || !!error || !events.length}
            onClick={download}
          >
            Export this page
          </button>
        </div>
      </div>
      <section className="panel">
        <label className="label" htmlFor="activity-kind">
          Activity type
        </label>
        <select
          id="activity-kind"
          className="input"
          value={kind}
          disabled={loading}
          onChange={(e) => {
            setKind(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All admin changes</option>
          <option value="card">Card edits & deletions</option>
          <option value="user">User role changes</option>
          <option value="page">Site content changes</option>
        </select>
        <p className="helperText">
          History starts with this update. Changes made outside the app’s admin
          tools are not included.
        </p>
      </section>
      {error ? (
        <p className="workflowNotice" role="alert">
          {error}
        </p>
      ) : loading ? (
        <p role="status">Loading activity…</p>
      ) : events.length ? (
        <section className="panel">
          <ol className="adminActivityList">
            {events.map((row) => (
              <li key={row.id}>
                <div className="adminActivityTop">
                  <strong>{ACTIVITY_LABELS[row.action] || row.action}</strong>
                  <time dateTime={row.created_at}>
                    {new Date(row.created_at).toLocaleString()}
                  </time>
                </div>
                <p>{row.summary}</p>
                <p className="helperText">By {row.actor_label}</p>
                {activityDetail(row) ? (
                  <small className="helperText">{activityDetail(row)}</small>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="sfPager">
            <span>
              {total.toLocaleString()} changes · Page {page} of {pages}
            </span>
            <div className="buttonRow">
              <button
                className="btn ghost"
                disabled={page <= 1}
                onClick={() => setPage((n) => n - 1)}
              >
                Previous
              </button>
              <button
                className="btn ghost"
                disabled={page >= pages}
                onClick={() => setPage((n) => n + 1)}
              >
                Next page
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="panel">
          <h2>No activity yet</h2>
          <p>
            New admin changes will appear here. Select another activity type to
            see other changes.
          </p>
        </section>
      )}
    </div>
  );
}
