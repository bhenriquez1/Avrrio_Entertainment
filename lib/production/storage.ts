import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/config";

const LOCAL_PREFIX = "avrrio:studio";

function localKey(uid: string, col: string) {
  return `${LOCAL_PREFIX}:${uid}:${col}`;
}
function readLocal<T>(uid: string, col: string): T[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(localKey(uid, col));
  return raw ? (JSON.parse(raw) as T[]) : [];
}
function writeLocal<T>(uid: string, col: string, items: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(localKey(uid, col), JSON.stringify(items));
}

export async function listItems<T extends { id: string }>(uid: string, col: string): Promise<T[]> {
  if (isFirebaseConfigured && db) {
    const snap = await getDocs(collection(db, "users", uid, col));
    return snap.docs.map((d) => d.data() as T);
  }
  return readLocal<T>(uid, col);
}
export async function getItem<T extends { id: string }>(uid: string, col: string, id: string): Promise<T | null> {
  if (isFirebaseConfigured && db) {
    const snap = await getDoc(doc(db, "users", uid, col, id));
    return snap.exists() ? (snap.data() as T) : null;
  }
  const items = readLocal<T>(uid, col);
  return items.find((i) => i.id === id) ?? null;
}
export async function saveItem<T extends { id: string }>(uid: string, col: string, item: T): Promise<void> {
  if (isFirebaseConfigured && db) {
    await setDoc(doc(db, "users", uid, col, item.id), item);
    return;
  }
  const items = readLocal<T>(uid, col);
  const idx = items.findIndex((i) => i.id === item.id);
  if (idx >= 0) items[idx] = item; else items.push(item);
  writeLocal(uid, col, items);
}
export async function deleteItem(uid: string, col: string, id: string): Promise<void> {
  if (isFirebaseConfigured && db) {
    await deleteDoc(doc(db, "users", uid, col, id));
    return;
  }
  const items = readLocal<{ id: string }>(uid, col);
  writeLocal(uid, col, items.filter((i) => i.id !== id));
}
