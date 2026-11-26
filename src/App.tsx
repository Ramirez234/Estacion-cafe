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
