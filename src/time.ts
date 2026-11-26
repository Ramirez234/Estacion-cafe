// Perú usa UTC-5 todo el año (sin horario de verano).
const OFFSET = 5 * 60 * 60 * 1000;
export const TZ = "America/Lima";

export const dayKey = (d: Date | string) => new Date(new Date(d).getTime() - OFFSET).toISOString().slice(0, 10);
export const monthRange = (y: number, m: number) => ({
  from: new Date(Date.UTC(y, m, 1) + OFFSET).toISOString(),
  to: new Date(Date.UTC(y, m + 1, 1) + OFFSET).toISOString(),
});
export const limaNow = () => {
  const k = dayKey(new Date());
  return { y: +k.slice(0, 4), m: +k.slice(5, 7) - 1, key: k };
};
export const timeOf = (d: string) =>
  new Date(d).toLocaleTimeString("es-PE", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit" });
export const dateTimeOf = (d: string) =>
  new Date(d).toLocaleString("es-PE", { timeZone: TZ, dateStyle: "medium", timeStyle: "medium" });
export const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
