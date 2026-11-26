// Carta oficial de Estación Café. Precios en céntimos de sol (S/ 8 = 800).
// Este archivo lo usan tanto la web como el servidor (que recalcula los totales).

export type Size = { label: string; price: number };
export type MenuItem = {
  id: string;
  name: string;
  desc?: string;
  sizes: Size[]; // uno solo si tiene precio único
  photo?: string; // id de foto en Unsplash
  drink?: boolean; // admite extras
};
export type Category = { id: string; name: string; tagline: string; items: MenuItem[] };

const one = (price: number, label = ""): Size[] => [{ label, price }];
const two = (a: number, b: number, la = "12 oz", lb = "16 oz"): Size[] => [
  { label: la, price: a },
  { label: lb, price: b },
];

export const CATEGORIES: Category[] = [
  {
    id: "espresso",
    name: "Espresso Bar",
    tagline: "Calientes, recién extraídos",
    items: [
      { id: "espresso", name: "Espresso", desc: "Shot intenso de nuestro blend de la casa.", sizes: one(800, "4 oz"), photo: "1510707577719-ae7c14805e3a", drink: true },
      { id: "macchiato", name: "Macchiato", desc: "Espresso manchado con espuma de leche.", sizes: one(800, "4 oz"), photo: "1497935586351-b67a49e012bf", drink: true },
      { id: "americano", name: "Americano", desc: "Espresso alargado con agua caliente.", sizes: two(900, 1200, "8 oz", "12 oz"), photo: "1514432324607-a09d9b4aefdd", drink: true },
      { id: "capuccino", name: "Capuccino", desc: "Espresso, leche vaporizada y espuma cremosa.", sizes: two(1100, 1300, "8 oz", "12 oz"), photo: "1572442388796-11668a67e53d", drink: true },
      { id: "flat-white", name: "Flat White", desc: "Doble ristretto con microespuma sedosa.", sizes: one(1100, "8 oz"), photo: "1485808191679-5f86510681a2", drink: true },
      { id: "latte", name: "Latte", desc: "Suave, cremoso y con arte latte.", sizes: two(1300, 1400), photo: "1541167760496-1628856ab772", drink: true },
      { id: "caramel-latte", name: "Caramel Latte", desc: "Latte con jarabe de caramelo.", sizes: two(1400, 1600), photo: "1495474472287-4d71bcdd2085", drink: true },
      { id: "vanilla-latte", name: "Vanilla Latte", desc: "Latte con un toque de vainilla.", sizes: two(1400, 1600), photo: "1534778101976-62847782c213", drink: true },
      { id: "mocaccino", name: "Mocaccino", desc: "Espresso, chocolate y leche vaporizada.", sizes: two(1400, 1600), photo: "1509042239860-f550ce710b93", drink: true },
      { id: "algarrobina-latte", name: "Algarrobina Latte", desc: "Nuestro clásico peruano con algarrobina.", sizes: two(1300, 1500), photo: "1512568400610-62da28bc8a13", drink: true },
      { id: "nutellatte", name: "Nutellatte", desc: "Latte con Nutella. Puro antojo.", sizes: two(1600, 1800), photo: "1578314675249-a6910f80cc4e", drink: true },
    ],
  },
  {
    id: "blends",
    name: "Otros Blends",
    tagline: "Sin café, con mucho sabor",
    items: [
      { id: "matcha-latte", name: "Matcha Latte", desc: "Matcha ceremonial batido con leche.", sizes: one(1200, "7 oz"), photo: "1515823064-d6e0c04616a7", drink: true },
      { id: "chai-latte", name: "Chai Latte", desc: "Especias chai con leche vaporizada.", sizes: two(1300, 1500), photo: "1544787219-7f47ccb76574", drink: true },
      { id: "hot-choco", name: "Hot Choco", desc: "Chocolate caliente espeso y cremoso.", sizes: two(1300, 1500), photo: "1542990253-0d0f5be5f0ed", drink: true },
      { id: "tea-premium", name: "Tea Premium", desc: "Selección de infusiones premium.", sizes: two(1000, 1300), photo: "1576092768241-dec231879fc3", drink: true },
    ],
  },
  {
    id: "heladas",
    name: "Bebidas Heladas",
    tagline: "12 oz / 16 oz, con mucho hielo",
    items: [
      { id: "iced-americano", name: "Iced Americano", desc: "Espresso sobre hielo y agua fría.", sizes: two(1200, 1400), photo: "1461023058943-07fcbe16d735", drink: true },
      { id: "iced-latte", name: "Iced Latte", desc: "Espresso, leche fría y hielo.", sizes: two(1400, 1500), photo: "1517701604599-bb29b565090c", drink: true },
      { id: "iced-caramel", name: "Iced Caramel", desc: "Iced latte con caramelo.", sizes: two(1500, 1700), photo: "1592663527359-cf6642f54cff", drink: true },
      { id: "iced-mocha", name: "Iced Mocha", desc: "Chocolate, espresso y leche helada.", sizes: two(1500, 1700), photo: "1577805947697-89e18249d767", drink: true },
      { id: "iced-algarrobina", name: "Iced Algarrobina", desc: "La algarrobina, ahora helada.", sizes: two(1300, 1500), photo: "1570968915860-54d5c301fa9f", drink: true },
      { id: "orange-coffee", name: "Orange Coffee", desc: "Jugo de naranja con espresso.", sizes: two(1300, 1500), photo: "1600271886742-f049cd451bba", drink: true },
      { id: "iced-chai", name: "Iced Chai Latte", desc: "Chai especiado sobre hielo.", sizes: two(1400, 1600), photo: "1558857563-b371033873b8", drink: true },
      { id: "iced-tea", name: "Iced Tea", desc: "Té frío con limón.", sizes: two(1200, 1400), photo: "1556679343-c7306c1976bc", drink: true },
      { id: "blueberry-soda", name: "Blueberry Soda", desc: "Soda burbujeante de arándanos.", sizes: two(1400, 1600), photo: "1595981267035-7b04ca84a82d", drink: true },
      { id: "frappes", name: "Frappés", desc: "Batido helado con crema. Pregunta por los sabores.", sizes: two(1600, 1800), photo: "1572490122747-3968b75cc699", drink: true },
    ],
  },
  {
    id: "salados",
    name: "Salados",
    tagline: "Para acompañar tu café",
    items: [
      { id: "sandwich-pollo", name: "Sándwich de Pollo", sizes: one(800), photo: "1528735602780-2552fd46c7af" },
      { id: "croissant-pollo", name: "Croissant de pollo", sizes: one(1400), photo: "1555507036-ab1f4038808a" },
      { id: "especial-estacion", name: "Especial Estación", desc: "La receta de la casa.", sizes: one(1600), photo: "1609167830220-7164aa360951" },
      { id: "caprese-integral", name: "Caprese integral", sizes: one(1100), photo: "1592417817098-8fd3d9eb14a5" },
      { id: "focaccia-caprese", name: "Focaccia caprese", sizes: one(1400), photo: "1539252554453-80ab65ce3586" },
      { id: "triple-pollo", name: "Triple Pollo | durazno", sizes: one(1400), photo: "1553909489-cd47e0907980" },
      { id: "triple-jamon", name: "Triple Jamón | queso", sizes: one(1400), photo: "1550507992-eb63ffee0847" },
      { id: "wrap-pollo", name: "Wrap pollo | palta", sizes: one(1100), photo: "1626700051175-6818013e1d4f" },
      { id: "empanada-jq", name: "Empanada Jamón y queso", sizes: one(750), photo: "1568254183919-78a4f43a2877" },
      { id: "empanada-aji", name: "Empanada Ají de gallina", sizes: one(800), photo: "1601050690597-df0568f70950" },
      { id: "empanada-lomo", name: "Empanada Lomo", sizes: one(850), photo: "1519708227418-c8fd9a32b7a2" },
    ],
  },
  {
    id: "dulces",
    name: "Dulces",
    tagline: "Horneados con cariño",
    items: [
      { id: "keke-platano", name: "Keke de Plátano", sizes: one(800), photo: "1605286978633-2dec93ff88a2" },
      { id: "keke-arandanos", name: "Keke de Arándanos", sizes: one(900), photo: "1607958996333-41aef7caefaa" },
      { id: "keke-naranja", name: "Keke de Naranja", sizes: one(900), photo: "1587241321921-91a834d6d191" },
      { id: "alfajor", name: "Alfajor", sizes: one(600), photo: "1558961363-fa8fdf82db35" },
      { id: "cinnamon-roll", name: "Cinnamon roll / Lemon", sizes: one(800), photo: "1509365465985-25d11c17e812" },
      { id: "brownie", name: "Brownie especial", sizes: one(1100), photo: "1606313564200-e75d5e30476c" },
      { id: "galletas", name: "Galletas", sizes: one(900), photo: "1499636136210-6f4ee915583e" },
      { id: "pastel-nata", name: "Pastel de nata", sizes: one(700), photo: "1586985289688-ca3cf47d3e6e" },
      { id: "muffin-frambuesa", name: "Muffin frambuesa", sizes: one(700), photo: "1574085733277-851d9d856a3a" },
    ],
  },
];

export const EXTRAS = [
  { id: "shot", name: "Extra shot", price: 350 },
  { id: "chantilli", name: "Chantillí", price: 200 },
  { id: "leche-vegetal", name: "Leche vegetal", price: 250 },
  { id: "jarabe", name: "Extra jarabe", price: 250 },
];

export const ITEMS_BY_ID: Record<string, MenuItem> = Object.fromEntries(
  CATEGORIES.flatMap((c) => c.items.map((i) => [i.id, i])),
);

export const soles = (cents: number) =>
  "S/ " + (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));

export const photoUrl = (id: string, w = 480, h = 360) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&h=${h}&q=80`;
