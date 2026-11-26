import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { adminCheck, adminOrders, adminSetStatus, type Order } from "./api";
import { soles } from "./menu";
import { LOGO_URL } from "./config";
import { ring, unlockAudio } from "./chime";
import { dateTimeOf, dayKey, limaNow, monthRange, MONTHS, timeOf } from "./time";

const PW_KEY = "ec-admin";
const POLL_MS = 5000;

function parseOrder(order: Order) {
  const deliveryItem = order.items.find((i) => i.id === "__delivery__");
  const products = order.items.filter((i) => i.id !== "__delivery__");
  let delivery: { phone?: string; address?: string; reference?: string; proofImage?: string } = {};
  if (deliveryItem) {
    try {
      delivery = JSON.parse(deliveryItem.name);
    } catch {
      delivery = {};
    }
  }
  return { products, delivery };
}

export default function Admin({ onExit }: { onExit: () => void }) {
  const [pw, setPw] = useState(() => sessionStorage.getItem(PW_KEY) || "");
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(!!pw);
  const [view, setView] = useState<"cola" | "calendario">("cola");

  useEffect(() => {
    if (!pw) return;
    adminCheck(pw)
      .then(() => setAuthed(true))
      .catch(() => sessionStorage.removeItem(PW_KEY))
      .finally(() => setChecking(false));
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(PW_KEY);
    setPw("");
    setAuthed(false);
  }, []);

  if (checking) return <div className="admin-shell center">Verificando…</div>;
  if (!authed) {
    return (
      <Login
        onExit={onExit}
        onOk={(p) => {
          sessionStorage.setItem(PW_KEY, p);
          setPw(p);
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <div className="admin-shell">
      <div className="admin-top">
        <div className="brand">
          <img src={LOGO_URL} alt="" width={44} height={42} />
          <div>
            <b>Panel Estación Café</b>
            <small>Pedidos y ganancias</small>
          </div>
        </div>
        <div className="seg">
          <button className={view === "cola" ? "on" : ""} onClick={() => setView("cola")}>
            Cola en vivo
          </button>
          <button className={view === "calendario" ? "on" : ""} onClick={() => setView("calendario")}>
            Calendario y reporte
          </button>
        </div>
        <div className="admin-actions">
          <button className="ghost" onClick={onExit}>
            Ver carta
          </button>
          <button className="ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </div>
      <div hidden={view !== "cola"}>
        <Queue pw={pw} onAuthError={logout} />
      </div>
      {view === "calendario" && <Calendar pw={pw} onAuthError={logout} />}
    </div>
  );
}

function Login({ onOk, onExit }: { onOk: (pw: string) => void; onExit: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    unlockAudio();
    setBusy(true);
    setError("");
    try {
      await adminCheck(value);
      onOk(value);
    } catch (err) {
      setError((err as { status?: number }).status === 401 ? "Contraseña incorrecta" : (err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin-shell center">
      <form className="login" onSubmit={submit}>
        <img src={LOGO_URL} alt="Estación Café" width={120} height={115} />
        <h1>Acceso administrador</h1>
        <label className="field">
          <span>Contraseña</span>
          <input type="password" value={value} onChange={(e) => setValue(e.target.value)} autoFocus autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="primary wide" disabled={busy || !value}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <button type="button" className="link" onClick={onExit}>
          ← Volver a la carta
        </button>
      </form>
    </div>
  );
}

function Queue({ pw, onAuthError }: { pw: string; onAuthError: () => void }) {
  const [pending, setPending] = useState<Order[] | null>(null);
  const [delivered, setDelivered] = useState<Order[]>([]);
  const [sound, setSound] = useState(true);
  const [fresh, setFresh] = useState<Set<number>>(new Set());
  const [error, setError] = useState("");
  const [previewProof, setPreviewProof] = useState<string | null>(null);
  const known = useRef<Set<number> | null>(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    try {
      const today = limaNow();
      const range = monthRange(today.y, today.m);
      const [p, all] = await Promise.all([
        adminOrders(pw, { status: "pendiente" }),
        adminOrders(pw, { status: "pagado", from: range.from, to: range.to }),
      ]);
      const ids = new Set(p.map((o) => o.id));
      if (known.current) {
        const newOnes = p.filter((o) => !known.current!.has(o.id)).map((o) => o.id);
        if (newOnes.length) {
          if (soundRef.current) ring();
          setFresh((f) => new Set([...f, ...newOnes]));
          setTimeout(() => setFresh((f) => new Set([...f].filter((i) => !newOnes.includes(i)))), 8000);
        }
        known.current.forEach((i) => ids.add(i));
      }
      known.current = ids;
      setPending(p);
      setDelivered(all.filter((o) => dayKey(o.createdAt) === today.key));
      setError("");
    } catch (err) {
      if ((err as { status?: number }).status === 401) return onAuthError();
      setError("Sin conexión. Reintentando…");
    }
  }, [pw, onAuthError]);

  useEffect(() => {
    void load();
    const t = setInterval(load, POLL_MS);
    const c = setInterval(() => tick((n) => n + 1), 30000);
    return () => {
      clearInterval(t);
      clearInterval(c);
    };
  }, [load]);

  useEffect(() => {
    document.title = pending?.length ? `(${pending.length}) Pedidos · Estación Café` : "Panel · Estación Café";
    return () => {
      document.title = "Estación Café · Cafetería sobre ruedas";
    };
  }, [pending?.length]);

  const mark = async (o: Order, status: Order["status"]) => {
    try {
      await adminSetStatus(pw, o.id, status);
      await load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const todayTotal = delivered.reduce((s, o) => s + o.totalCents, 0);

  return (
    <div className="admin-body">
      <div className="queue-bar">
        <div className="stat">
          <small>En cola</small>
          <b>{pending?.length ?? "—"}</b>
        </div>
        <div className="stat">
          <small>Entregados hoy</small>
          <b>{delivered.length}</b>
        </div>
        <div className="stat accent">
          <small>Ganancia de hoy</small>
          <b>{soles(todayTotal)}</b>
        </div>
        <div className="queue-tools">
          <span className="live">
            <i /> En vivo
          </span>
          <button className={sound ? "ghost on" : "ghost"} onClick={() => (unlockAudio(), setSound((s) => !s))}>
            {sound ? "🔔 Timbre activado" : "🔕 Timbre apagado"}
          </button>
          <button className="ghost" onClick={() => ring()}>
            Probar timbre
          </button>
        </div>
      </div>
      {error && <p className="error">{error}</p>}

      {pending === null ? (
        <p className="muted pad">Cargando pedidos…</p>
      ) : pending.length === 0 ? (
        <div className="empty-queue">
          <img src={LOGO_URL} alt="" width={120} height={115} />
          <p>No hay pedidos pendientes. El timbre sonará cuando llegue uno nuevo.</p>
        </div>
      ) : (
        <div className="orders">
          {pending.map((o) => (
            <OrderCard key={o.id} order={o} fresh={fresh.has(o.id)} onViewProof={(img) => setPreviewProof(img)}>
              <button className="primary wide" onClick={() => mark(o, "pagado")}>
                ✓ Marcar Pagado / Entregado
              </button>
            </OrderCard>
          ))}
        </div>
      )}

      {delivered.length > 0 && (
        <>
          <h3 className="sub">Entregados hoy</h3>
          <ul className="done-list">
            {delivered.map((o) => {
              const { products, delivery } = parseOrder(o);
              return (
                <li key={o.id}>
                  <div>
                    <b>
                      #{o.id} {o.customerName}
                    </b>
                    <span>
                      {products.map((i) => `${i.qty}× ${i.name}`).join(", ")}
                      {delivery.address ? ` · 📍 ${delivery.address}` : ""}
                    </span>
                  </div>
                  <div className="done-end">
                    {delivery.proofImage && (
                      <button type="button" className="ghost" onClick={() => setPreviewProof(delivery.proofImage!)}>
                        Ver captura
                      </button>
                    )}
                    <span className={"pm " + o.paymentMethod}>{o.paymentMethod}</span>
                    <b>{soles(o.totalCents)}</b>
                    <button className="link" onClick={() => mark(o, "pendiente")} title="Devolver a cola">
                      Deshacer
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {previewProof && (
        <div
          className="overlay"
          onClick={() => setPreviewProof(null)}
          style={{ zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
                        style={{ background: "#fff", padding: "1rem", borderRadius: "14px", maxWidth: "90vw", textAlign: "center" }}
          >
            <h3 style={{ marginTop: 0 }}>Comprobante de pago</h3>
            <img
              src={previewProof}
              alt="Captura de pago del cliente"
              style={{ maxWidth: "100%", maxHeight: "75vh", borderRadius: "10px", display: "block", margin: "0 auto" }}
            />
            <button type="button" className="primary wide" style={{ marginTop: "0.75rem" }} onClick={() => setPreviewProof(null)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  fresh,
  onViewProof,
  children,
}: {
  order: Order;
  fresh?: boolean;
  onViewProof?: (img: string) => void;
  children?: ReactNode;
}) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000));
  const { products, delivery } = parseOrder(order);

  return (
    <div className={fresh ? "order fresh" : "order"}>
      <div className="order-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
        <div>
          <span className="num">#{order.id}</span>
          <h3>{order.customerName}</h3>
        </div>
        <div className="meta">
          <span className={"pm " + order.paymentMethod}>{order.paymentMethod}</span>
          <small>
            {timeOf(order.createdAt)} · hace {mins} min
          </small>
        </div>
      </div>

      {(delivery.phone || delivery.address) && (
        <div
          style={{
            background: "#faf6f2",
            padding: "0.65rem 0.8rem",
            borderRadius: "10px",
            marginBottom: "0.65rem",
            fontSize: "0.88rem",
            lineHeight: 1.4,
          }}
        >
          {delivery.phone && (
            <div>
              <b>📱 Celular:</b> {delivery.phone}
            </div>
          )}
          {delivery.address && (
            <div>
              <b>📍 Dirección:</b> {delivery.address}
            </div>
          )}
          {delivery.reference && (
            <div>
              <b>Ref:</b> {delivery.reference}
            </div>
          )}
        </div>
      )}

      <ul>
        {products.map((i, idx) => (
          <li key={idx}>
            <span>
              <b>{i.qty}×</b> {i.name}
              {i.size && <em> ({i.size})</em>}
              {i.extras.length > 0 && <small> + {i.extras.join(", ")}</small>}
            </span>
            <span>{soles(i.unitCents * i.qty)}</span>
          </li>
        ))}
      </ul>

      {delivery.proofImage && (
        <div style={{ margin: "0.65rem 0", textAlign: "center" }}>
          <img
            src={delivery.proofImage}
            alt="Captura de Yape/Plin"
            onClick={() => onViewProof?.(delivery.proofImage!)}
            style={{
              maxHeight: "130px",
              borderRadius: "8px",
              border: "2px solid #2e7d32",
              cursor: "pointer",
            }}
          />
          <div>
            <button
              type="button"
              className="link"
              onClick={() => onViewProof?.(delivery.proofImage!)}
              style={{ fontSize: "0.85rem" }}
            >
              🔍 Ampliar captura de pago
            </button>
          </div>
        </div>
      )}

      <div className="order-total">
        <span>Total</span>
        <b>{soles(order.totalCents)}</b>
      </div>
      {children}
    </div>
  );
}
function Calendar({ pw, onAuthError }: { pw: string; onAuthError: () => void }) {
  const now = limaNow();
  const [ym, setYm] = useState({ y: now.y, m: now.m });
  const [orders, setOrders] = useState<Order[]>([]);
  const [day, setDay] = useState<string>(now.key);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const { from, to } = monthRange(ym.y, ym.m);
    adminOrders(pw, { status: "pagado", from, to })
      .then((rows) => {
        if (!cancel) {
          setOrders(rows);
          setError("");
        }
      })
      .catch((err) => {
        if (cancel) return;
        if ((err as { status?: number }).status === 401) return onAuthError();
        setError((err as Error).message);
      })
      .finally(() => !cancel && setLoading(false));
    return () => {
      cancel = true;
    };
  }, [pw, ym, onAuthError]);

  const byDay = useMemo(() => {
    const map: Record<string, Order[]> = {};
    for (const o of orders) {
      const k = dayKey(o.createdAt);
      (map[k] ||= []).push(o);
    }
    return map;
  }, [orders]);

  const monthTotal = orders.reduce((s, o) => s + o.totalCents, 0);
  const yapeTotal = orders.filter((o) => o.paymentMethod === "yape").reduce((s, o) => s + o.totalCents, 0);
  const plinTotal = orders.filter((o) => o.paymentMethod === "plin").reduce((s, o) => s + o.totalCents, 0);
  const dayOrders = byDay[day] || [];
  const dayTotal = dayOrders.reduce((s, o) => s + o.totalCents, 0);

  const firstWeekday = (new Date(Date.UTC(ym.y, ym.m - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(ym.y, ym.m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const shift = (d: number) => {
    const dt = new Date(Date.UTC(ym.y, ym.m - 1 + d, 1));
    const ny = dt.getUTCFullYear();
    const nm = dt.getUTCMonth() + 1;
    setYm({ y: ny, m: nm });
    setDay(`${ny}-${String(nm).padStart(2, "0")}-01`);
  };

  return (
    <div className="admin-body">
      <div className="month-head">
        <div className="month-nav">
          <button className="ghost" onClick={() => shift(-1)} aria-label="Mes anterior">
            ‹
          </button>
          <h2>
            {MONTHS[ym.m - 1]} {ym.y}
          </h2>
          <button className="ghost" onClick={() => shift(1)} aria-label="Mes siguiente">
            ›
          </button>
        </div>
        <div className="month-kpis">
          <div className="stat accent">
            <small>Ganancia del mes</small>
            <b>{soles(monthTotal)}</b>
          </div>
          <div className="stat">
            <small>Pedidos pagados</small>
            <b>{orders.length}</b>
          </div>
          <div className="stat">
            <small>Yape / Plin</small>
            <b>
              {soles(yapeTotal)} · {soles(plinTotal)}
            </b>
          </div>
        </div>
      </div>

      {error && <p className="error">{error}</p>}
      {loading ? (
        <p className="muted pad">Cargando reporte…</p>
      ) : (
        <div className="cal-layout">
          <div className="cal">
            <div className="cal-dow">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="cal-grid">
              {cells.map((n, i) => {
                if (!n) return <div key={i} className="cal-blank" />;
                const key = `${ym.y}-${String(ym.m).padStart(2, "0")}-${String(n).padStart(2, "0")}`;
                const list = byDay[key] || [];
                const sum = list.reduce((s, o) => s + o.totalCents, 0);
                const selected = key === day;
                const isToday = key === now.key;
                return (
                  <button
                    key={key}
                    className={["cal-day", selected && "sel", isToday && "today", list.length > 0 && "has"].filter(Boolean).join(" ")}
                    onClick={() => setDay(key)}
                  >
                    <span className="cal-n">{n}</span>
                    {list.length > 0 && (
                      <>
                        <b>{soles(sum)}</b>
                        <small>{list.length} ped.</small>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="day-panel">
            <div className="day-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <small>Detalle del día</small>
                <h3>{day}</h3>
              </div>
              <div className="day-sum">
                <b>{soles(dayTotal)}</b>
                <small>{dayOrders.length} pedidos</small>
              </div>
            </div>
            {dayOrders.length === 0 ? (
              <p className="muted">Sin pedidos cobrados este día.</p>
            ) : (
              <ul className="day-list">
                {dayOrders.map((o) => {
                  const { products } = parseOrder(o);
                  return (
                    <li key={o.id}>
                      <div>
                        <b>
                          #{o.id} {o.customerName}
                        </b>
                        <small>
                          {dateTimeOf(o.createdAt)} · {o.paymentMethod.toUpperCase()}
                        </small>
                        <p>{products.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                      </div>
                      <b>{soles(o.totalCents)}</b>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

