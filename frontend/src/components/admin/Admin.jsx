import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { errorMessage } from "../../api";
import { useAuth } from "../../contexts/AuthContext";
import { formatINR } from "../../utils";

const ORDER_STATUSES = ["PLACED", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"];
const fmtDate = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "");
const fmtDateTime = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

// Two-step delete button (no browser pop-ups)
const ConfirmButton = ({ label, confirmLabel = "Yes, delete", onConfirm, disabled }) => {
  const [asking, setAsking] = useState(false);
  if (!asking) return <button type="button" className="linkbtn linkbtn--danger" disabled={disabled} onClick={() => setAsking(true)}>{label}</button>;
  return (
    <span className="confirm">
      <button type="button" className="btn btn--danger btn--sm" onClick={() => { setAsking(false); onConfirm(); }}>{confirmLabel}</button>
      <button type="button" className="linkbtn" onClick={() => setAsking(false)}>Cancel</button>
    </span>
  );
};

/* ================= Reservations ================= */
const ReservationsAdmin = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState("active");
  const [q, setQ] = useState("");

  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    api.get("/api/admin/reservations", { params: { status: scope === "all" ? "all" : undefined } })
      .then(({ data }) => { if (alive) setRows(data.reservations); })
      .catch((e) => { if (alive) toast.error(errorMessage(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [scope, tick]);
  const refresh = () => { setLoading(true); setTick((n) => n + 1); };

  const cancel = async (id) => {
    try { await api.post(`/api/admin/reservations/${id}/cancel`); toast.success("Reservation cancelled."); refresh(); }
    catch (e) { toast.error(errorMessage(e)); }
  };
  const shown = rows.filter((r) => !q.trim() || [r.name, r.email, r.phone, r.reservationId].some((v) => String(v || "").toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <div className="panel">
      <div className="admintools">
        <h2>Reservations <small className="muted">({shown.length})</small></h2>
        <div className="admintools__right">
          <label className="sr-only" htmlFor="res-search">Search reservations</label>
          <input id="res-search" type="search" placeholder="Search name, email, phone or ID" value={q} onChange={(e) => setQ(e.target.value)} />
          <select aria-label="Which reservations" value={scope} onChange={(e) => { setLoading(true); setScope(e.target.value); }}><option value="active">Active</option><option value="all">All (incl. cancelled)</option></select>
          <button type="button" className="btn btn--outline btn--sm" onClick={refresh}>Refresh</button>
        </div>
      </div>
      {loading && <p className="muted" role="status">Loading…</p>}
      {!loading && shown.length === 0 && <p className="muted">No reservations found.</p>}
      {shown.length > 0 && (
        <div className="tablewrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Date</th><th>Time</th><th>Table</th><th>Guests</th><th>Name</th><th>Email</th><th>Phone</th><th>Request</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.reservationId}>
                  <td data-label="ID"><strong>{r.reservationId}</strong></td>
                  <td data-label="Date">{fmtDate(r.date)}</td>
                  <td data-label="Time">{r.startTime}–{r.endTime}</td>
                  <td data-label="Table">{r.seatId}</td>
                  <td data-label="Guests">{r.guests}</td>
                  <td data-label="Name">{r.name}</td>
                  <td data-label="Email"><a href={`mailto:${r.email}`}>{r.email}</a></td>
                  <td data-label="Phone">{r.phone}</td>
                  <td data-label="Request">{r.specialRequest || "—"}</td>
                  <td data-label="Status"><span className={`tag tag--${r.status}`}>{r.status}</span></td>
                  <td>{r.status !== "canceled" && <ConfirmButton label="Cancel" confirmLabel="Yes, cancel" onConfirm={() => cancel(r.reservationId)} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ================= Orders ================= */
const OrdersAdmin = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    api.get("/api/admin/orders")
      .then(({ data }) => { if (alive) setRows(data.orders); })
      .catch((e) => { if (alive) toast.error(errorMessage(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tick]);

  const setStatus = async (orderId, status) => {
    try { await api.patch(`/api/admin/orders/${orderId}/status`, { status }); setRows((r) => r.map((o) => (o.orderId === orderId ? { ...o, status } : o))); toast.success("Order updated."); }
    catch (e) { toast.error(errorMessage(e)); }
  };

  return (
    <div className="panel">
      <div className="admintools"><h2>Orders <small className="muted">({rows.length})</small></h2><button type="button" className="btn btn--outline btn--sm" onClick={() => { setLoading(true); setTick((n) => n + 1); }}>Refresh</button></div>
      {loading && <p className="muted" role="status">Loading…</p>}
      {!loading && rows.length === 0 && <p className="muted">No orders yet.</p>}
      {rows.length > 0 && (
        <div className="tablewrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.orderId}>
                  <td data-label="Order"><strong>{o.orderId}</strong></td>
                  <td data-label="Placed">{fmtDateTime(o.createdAt)}</td>
                  <td data-label="Customer">{o.customer.name}<br /><a href={`mailto:${o.customer.email}`}>{o.customer.email}</a><br />{o.customer.phone}</td>
                  <td data-label="Items">{o.items.map((i) => `${i.name} ×${i.qty}${i.comboName ? ` (${i.comboName})` : ""}`).join(", ")}{o.notes && <><br /><em className="muted">Note: {o.notes}</em></>}</td>
                  <td data-label="Total">{formatINR(o.total)}</td>
                  <td data-label="Status">
                    <label className="sr-only" htmlFor={`st-${o.orderId}`}>Status of order {o.orderId}</label>
                    <select id={`st-${o.orderId}`} value={o.status} onChange={(e) => setStatus(o.orderId, e.target.value)}>{ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ================= Dashboard shell ================= */
const TABS = [{ id: "reservations", label: "Reservations" }, { id: "orders", label: "Orders" }];

const Admin = () => {
  const { user, loading, isAdmin } = useAuth();
  const [tab, setTab] = useState("reservations");
  if (loading) return <p className="muted center section" role="status">Loading…</p>;
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />;

  return (
    <section className="admin section">
      <div className="container">
        <h1 className="heading">Admin dashboard</h1>
        <div className="tabs tabs--admin" role="tablist" aria-label="Admin sections">
          {TABS.map((t) => (
            <button key={t.id} role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} className={tab === t.id ? "is-active" : ""} onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>
        <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
          {tab === "reservations" && <ReservationsAdmin />}
          {tab === "orders" && <OrdersAdmin />}
        </div>
      </div>
    </section>
  );
};

export default Admin;
