import { useEffect, useState, type ChangeEvent, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { CATEGORIES, EXTRAS, ITEMS_BY_ID, photoUrl, soles, type MenuItem } from "./menu";
import { createOrder, type CartLine, type Order } from "./api";
import { LOGO_URL, PAYMENT } from "./config";
import { timeOf } from "./time";
import Admin from "./Admin";

const CART_KEY = "ec-cart";
const YAPE_PHONE_DIGITS = PAYMENT.phone.replace(/\D/g, "");

const lineUnit = (l: CartLine) => {
  const item = ITEMS_BY_ID[l.id];
  const size = item.sizes.find((s) => s.label === l.size) ?? item.sizes[0];
  return size.price + EXTRAS.filter((e) => l.extras.includes(e.id)).reduce((s, e) => s + e.price, 0);
};

async function compressProof(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Archivo de imagen inválido"));
      img.onload = () => {
        const max = 900;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(String(reader.result));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [tab, setTab] = useState(CATEGORIES[0].id);
  const [cart, setCart] = useState<CartLine[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || "[]") as CartLine[];
      return saved.filter((l) => ITEMS_BY_ID[l.id]);
    } catch {
      return [];
    }
  });
  const [picking, setPicking] = useState<MenuItem | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [done, setDone] = useState<Order | null>(null);
  const [admin, setAdmin] = useState(() => location.hash === "#admin");
  const [toast, setToast] = useState("");

  useEffect(() => localStorage.setItem(CART_KEY, JSON.stringify(cart)), [cart]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const count = cart.reduce((s, l) => s + l.qty, 0);
  const total = cart.reduce((s, l) => s + lineUnit(l) * l.qty, 0);
  const category = CATEGORIES.find((c) => c.id === tab)!;

  const add = (id: string, size: string, extras: string[], qty = 1) => {
    const key = [id, size, [...extras].sort().join("+")].join("|");
    setCart((c) => {
      const found = c.find((l) => l.key === key);
      if (found) return c.map((l) => (l.key === key ? { ...l, qty: l.qty + qty } : l));
      return [...c, { key, id, size, extras, qty }];
    });
    setToast(`${ITEMS_BY_ID[id].name} agregado`);
  };

  const quickAdd = (item: MenuItem) => {
    if (item.sizes.length > 1 || item.drink) setPicking(item);
    else add(item.id, item.sizes[0].label, []);
  };

  if (admin)
    return (
      <Admin
        onExit={() => {
          setAdmin(false);
          history.replaceState(null, "", location.pathname);
        }}
      />
    );

  return (
    <div className="page">
      <header className="hero">
        <img className="hero-logo" src={LOGO_URL} alt="Estación Café — Cafetería sobre ruedas" width={240} height={229} />
        <div className="hero-copy">
          <p className="eyebrow">Cafetería sobre ruedas · desde 2022</p>
          <h1>
            Tu parada de <em>buen café</em>.
          </h1>
          <p className="lede">
            Elige de la carta, escribe tus datos de delivery y confirma con Yape o Plin subiendo tu captura.
          </p>
        </div>
      </header>

      <nav className="tabs" aria-label="Categorías de la carta">
        {CATEGORIES.map((c, i) => (
          <button key={c.id} className={c.id === tab ? "tab active" : "tab"} onClick={() => setTab(c.id)}>
            <span className="tab-num">{String(i + 1).padStart(2, "0")}</span>
            {c.name}
          </button>
        ))}
      </nav>

      <main className="menu">
        <div className="menu-head">
          <h2>{category.name}</h2>
          <p>{category.tagline}</p>
        </div>
        <div className="grid">
          {category.items.map((item) => (
            <article key={item.id} className="card">
              <div className="card-media">
                {item.photo ? (
                  <img src={photoUrl(item.photo)} alt={item.name} loading="lazy" width={480} height={360} />
                ) : (
                  <div className="card-stamp">
                    <img src={LOGO_URL} alt="" />
                  </div>
                )}
              </div>
              <div className="card-body">
                <h3>{item.name}</h3>
                {item.desc && <p className="desc">{item.desc}</p>}
                <ul className="prices">
                  {item.sizes.map((s) => (
                    <li key={s.label}>
                      {s.label && <span className="oz">{s.label}</span>}
                      <span className="price">{soles(s.price)}</span>
                    </li>
                  ))}
                </ul>
                <button className="add" onClick={() => quickAdd(item)} aria-label={`Agregar ${item.name}`}>
                  + Agregar
                </button>
              </div>
            </article>
          ))}
        </div>

        <section className="extras">
          <h3>Extras rápidos</h3>
          <ul>
            {EXTRAS.map((e) => (
              <li key={e.id}>
                <span>{e.name}</span>
                <b>{soles(e.price)}</b>
              </li>
            ))}
          </ul>
          <p>Agrégalos al personalizar cualquier bebida.</p>
        </section>
      </main>

      <footer className="footer">
        <img src={LOGO_URL} alt="" width={56} height={53} />
        <p>Estación Café · Cafetería sobre ruedas</p>
        <button className="admin-link" onClick={() => setAdmin(true)}>
          Admin
        </button>
      </footer>

      {count > 0 && !cartOpen && (
        <button className="cart-bar" onClick={() => setCartOpen(true)}>
          <span className="cart-count">{count}</span>
          Ver mi pedido
          <b>{soles(total)}</b>
        </button>
      )}

      {toast && <div className="toast">{toast}</div>}

      {picking && (
        <Customize
          item={picking}
          onClose={() => setPicking(null)}
          onAdd={(size, extras, qty) => {
            add(picking.id, size, extras, qty);
            setPicking(null);
          }}
        />
      )}

      {cartOpen && (
        <Checkout
          cart={cart}
          total={total}
          setCart={setCart}
          onClose={() => setCartOpen(false)}
          onDone={(o) => {
            setCart([]);
            setCartOpen(false);
            setDone(o);
          }}
        />
      )}

      {done && <Confirmation order={done} onClose={() => setDone(null)} />}
    </div>
  );
}
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Customize({
  item,
  onClose,
  onAdd,
}: {
  item: MenuItem;
  onClose: () => void;
  onAdd: (size: string, extras: string[], qty: number) => void;
}) {
  const [size, setSize] = useState(item.sizes[0].label);
  const [extras, setExtras] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const unit =
    (item.sizes.find((s) => s.label === size)?.price ?? 0) +
    EXTRAS.filter((e) => extras.includes(e.id)).reduce((s, e) => s + e.price, 0);

  return (
    <Sheet title={item.name} onClose={onClose}>
      {item.photo && <img className="sheet-photo" src={photoUrl(item.photo, 720, 320)} alt="" />}
      {item.sizes.length > 1 && (
        <fieldset className="opts">
          <legend>Tamaño</legend>
          {item.sizes.map((s) => (
            <label key={s.label} className={size === s.label ? "opt on" : "opt"}>
              <input type="radio" name="size" checked={size === s.label} onChange={() => setSize(s.label)} />
              <span>{s.label}</span>
              <b>{soles(s.price)}</b>
            </label>
          ))}
        </fieldset>
      )}
      {item.drink && (
        <fieldset className="opts">
          <legend>Extras</legend>
          {EXTRAS.map((e) => {
            const on = extras.includes(e.id);
            return (
              <label key={e.id} className={on ? "opt on" : "opt"}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => setExtras((x) => (on ? x.filter((i) => i !== e.id) : [...x, e.id]))}
                />
                <span>{e.name}</span>
                <b>+{soles(e.price)}</b>
              </label>
            );
          })}
        </fieldset>
      )}
      <div className="sheet-foot">
        <div className="stepper">
          <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Menos">
            −
          </button>
          <span>{qty}</span>
          <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="Más">
            +
          </button>
        </div>
        <button className="primary" onClick={() => onAdd(size, extras, qty)}>
          Agregar · {soles(unit * qty)}
        </button>
      </div>
    </Sheet>
  );
}
function Checkout({
  cart,
  total,
  setCart,
  onClose,
  onDone,
}: {
  cart: CartLine[];
  total: number;
  setCart: Dispatch<SetStateAction<CartLine[]>>;
  onClose: () => void;
  onDone: (o: Order) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [method, setMethod] = useState<"yape" | "plin">("yape");
  const [step, setStep] = useState<"form" | "pay">("form");
  const [proofImage, setProofImage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const change = (key: string, d: number) =>
    setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const submitForm = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError("Escribe tu nombre para saber a quién entregar.");
    if (!phone.trim() || phone.replace(/\D/g, "").length < 6) {
      return setError("Escribe tu número de celular para el delivery.");
    }
    if (!address.trim()) return setError("Escribe tu dirección exacta.");
    setError("");
    setStep("pay");
  };

  const handleFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    try {
      const compressed = await compressProof(file);
      setProofImage(compressed);
    } catch {
      setError("No se pudo cargar la captura. Intenta con otra imagen.");
    }
  };

  const sendOrder = async () => {
    if (!proofImage) {
      return setError("Es obligatorio subir la captura de tu pago antes de confirmar.");
    }
    setBusy(true);
    setError("");
    try {
      const order = await createOrder({
        customerName: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        reference: reference.trim(),
        proofImage,
        paymentMethod: method,
        items: cart,
      });
      onDone(order);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (step === "pay") {
    return (
      <YapePay
        method={method}
        customerName={name.trim()}
        total={total}
        proofImage={proofImage}
        onFileChange={handleFile}
        busy={busy}
        error={error}
        onConfirm={sendOrder}
        onBack={() => {
          setStep("form");
          setError("");
        }}
        onClose={onClose}
      />
    );
  }

  return (
    <Sheet title="Tu pedido" onClose={onClose}>
      <ul className="cart-list">
        {cart.map((l) => {
          const item = ITEMS_BY_ID[l.id];
          const extraNames = EXTRAS.filter((e) => l.extras.includes(e.id)).map((e) => e.name);
          const meta = [l.size, ...extraNames].filter(Boolean).join(" · ");
          return (
            <li key={l.key}>
              <div>
                <b>{item.name}</b>
                {meta && <small>{meta}</small>}
              </div>
              <div className="line-end">
                <div className="stepper sm">
                  <button type="button" onClick={() => change(l.key, -1)} aria-label="Quitar uno">
                    −
                  </button>
                  <span>{l.qty}</span>
                  <button type="button" onClick={() => change(l.key, 1)} aria-label="Agregar uno">
                    +
                  </button>
                </div>
                <span className="line-price">{soles(lineUnit(l) * l.qty)}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={submitForm}>
        <label className="field">
          <span>Tu nombre</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Camila"
            maxLength={80}
            required
          />
        </label>

        <label className="field">
          <span>Celular de contacto (Delivery)</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej. 999 888 777"
            maxLength={20}
            required
          />
        </label>

        <label className="field">
          <span>Dirección exacta</span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Ej. Av. Larco 123, Urb. California"
            maxLength={140}
            required
          />
        </label>

        <label className="field">
          <span>Referencia (opcional)</span>
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Ej. Frente al parque, casa blanca"
            maxLength={120}
          />
        </label>

        <div className="pay">
          <span>¿Cómo pagas?</span>
          <div className="pay-opts">
            <button type="button" className={method === "yape" ? "pay-opt on" : "pay-opt"} onClick={() => setMethod("yape")}>
              Yape
            </button>
            <button type="button" className={method === "plin" ? "pay-opt on" : "pay-opt"} onClick={() => setMethod("plin")}>
              Plin
            </button>
          </div>
          <small className="pay-hint">
            En el siguiente paso verás el QR y número para transferir y subir tu captura.
          </small>
        </div>

        {error && <p className="error">{error}</p>}

        <div className="total-row">
          <span>Total</span>
          <b>{soles(total)}</b>
        </div>

        <button className="primary wide" disabled={busy}>
          Continuar al pago · {soles(total)}
        </button>
      </form>
    </Sheet>
  );
}
function YapePay({
  method,
  customerName,
  total,
  proofImage,
  onFileChange,
  busy,
  error,
  onConfirm,
  onBack,
  onClose,
}: {
  method: "yape" | "plin";
  customerName: string;
  total: number;
  proofImage: string;
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void;
  busy: boolean;
  error: string;
  onConfirm: () => void;
  onBack: () => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyPhone = async () => {
    try {
      await navigator.clipboard.writeText(YAPE_PHONE_DIGITS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Sheet title={`Pagar con ${method === "plin" ? "Plin" : "Yape"}`} onClose={onClose}>
      <div className="yape-pay" style={{ paddingBottom: "2.5rem" }}>
        <p className="yape-lead">
          Hola <b>{customerName}</b>, escanea el QR desde <b>Yape o Plin</b> o transfiere al número por el monto exacto:
        </p>

        <div className="yape-amount">
          <span>Monto exacto</span>
          <b>{soles(total)}</b>
        </div>

        {PAYMENT.yapeQr && (
          <div className="qr">
            <img src={PAYMENT.yapeQr} alt="Código QR de Yape / Plin Estación Café" width={220} height={220} />
          </div>
        )}

        <div className="yape-phone-box">
          <div>
            <small>Número para {method === "plin" ? "Plin / Yape" : "Yape / Plin"}</small>
            <b>{PAYMENT.phone}</b>
            <small>Titular: Fani Amerita Ruiz Medina (Estación Café)</small>
          </div>
          <button type="button" className="copy" onClick={copyPhone}>
            {copied ? "✓ Copiado" : "Copiar número"}
          </button>
        </div>

        <div
          style={{
            marginTop: "1rem",
            padding: "0.9rem",
            borderRadius: "12px",
            border: proofImage ? "2px solid #2e7d32" : "2px dashed #8d6e63",
            background: proofImage ? "#f1f8e9" : "#faf6f2",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 0.5rem", fontWeight: 700, fontSize: "0.95rem" }}>
            {proofImage ? "✓ Captura de pago adjuntada" : "📸 Paso obligatorio: Sube tu captura de pago"}
          </p>
          <label
            style={{
              display: "inline-block",
              padding: "0.55rem 1rem",
              borderRadius: "8px",
              background: "#3e2723",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "0.9rem",
            }}
          >
            {proofImage ? "Cambiar captura" : "Seleccionar captura de Yape / Plin"}
            <input type="file" accept="image/*" onChange={onFileChange} style={{ display: "none" }} />
          </label>
          {proofImage && (
            <div style={{ marginTop: "0.75rem" }}>
              <img
                src={proofImage}
                alt="Vista previa de captura"
                style={{ maxHeight: "160px", borderRadius: "8px", border: "1px solid #ccc" }}
              />
            </div>
          )}
        </div>

        {error && <p className="error">{error}</p>}

        <button
          type="button"
          className="primary wide"
          onClick={onConfirm}
          disabled={busy || !proofImage}
          style={{ opacity: busy || !proofImage ? 0.55 : 1, marginTop: "0.75rem" }}
        >
          {busy ? "Enviando pedido…" : proofImage ? "Ya hice el pago · Confirmar pedido" : "Sube tu captura para continuar"}
        </button>

        <button type="button" className="link" onClick={onBack} disabled={busy}>
          ← Volver a mi pedido
        </button>
      </div>
    </Sheet>
  );
}

function Confirmation({ order, onClose }: { order: Order; onClose: () => void }) {
  const deliveryLine = order.items.find((i) => i.id === "__delivery__");
  const productLines = order.items.filter((i) => i.id !== "__delivery__");
  let delivery: { phone?: string; address?: string; reference?: string } = {};
  if (deliveryLine) {
    try {
      delivery = JSON.parse(deliveryLine.name);
    } catch {
      delivery = {};
    }
  }

  return (
    <Sheet title="¡Pedido enviado!" onClose={onClose}>
      <div className="confirm">
        <span className="badge">Pedido #{order.id}</span>
        <p>
          Gracias, <b>{order.customerName}</b>. Recibimos tu pedido y tu comprobante de pago ({order.paymentMethod.toUpperCase()}) a las{" "}
          {timeOf(order.createdAt)}. Ya lo estamos preparando.
        </p>

        {delivery.address && (
          <div style={{ background: "#faf6f2", padding: "0.75rem", borderRadius: "10px", margin: "0.75rem 0", fontSize: "0.9rem" }}>
            <div>
              <b>📍 Delivery:</b> {delivery.address}
            </div>
            {delivery.reference && (
              <div>
                <b>Ref:</b> {delivery.reference}
              </div>
            )}
            {delivery.phone && (
              <div>
                <b>📱 Celular:</b> {delivery.phone}
              </div>
            )}
          </div>
        )}

        <ul className="mini">
          {productLines.map((i, idx) => (
            <li key={idx}>
              <span>
                {i.qty}× {i.name} {i.size && `(${i.size})`}
              </span>
              <b>{soles(i.unitCents * i.qty)}</b>
            </li>
          ))}
        </ul>

        <div className="total-row">
          <span>Total</span>
          <b>{soles(order.totalCents)}</b>
        </div>

        <button className="primary wide" onClick={onClose}>
          Listo
        </button>
      </div>
    </Sheet>
  );
}

