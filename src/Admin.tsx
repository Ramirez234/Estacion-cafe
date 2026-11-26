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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(PW_KEY);
    setPw("");
    setAuthed(false);
  }, []);

  if (checking) return <div className="admin-shell center">Verificando…</div>;
  if (!authed)
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

  return (
    <div className="admin-shell">
      <header className="admin-top">
        <div className="brand">
          <img src={LOGO_URL} alt="" width={44} height={42} />
          <div>
            <b>Panel Estación Café</b>
            <small>Pedidos y ganancias</small>
          </div>
        </div>
        <nav className="seg">
          <button className={view === "cola" ? "on" : ""} onClick={() => setView("cola")}>
            Cola en vivo
          </button>
          <button className={view === "calendario" ? "on" : ""} onClick={() => setView("calendario")}>
            Calendario y reporte
          </button>
        </nav>
        <div className="admin-actions">
          <button className="ghost" onClick={onExit}>
            Ver carta
          </button>
          <button className="ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </header>
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
    <section className="admin-body">
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
