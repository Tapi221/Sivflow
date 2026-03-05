declare module "firebase/firestore" {
  export function collection(
    firestore: unknown,
    ...pathSegments: string[]
  ): unknown;
  export function doc(firestore: unknown, ...pathSegments: string[]): unknown;
  export function getDoc(reference: unknown): Promise<any>;
  export function getDocs(query: unknown): Promise<any>;
  export function setDoc(
    reference: unknown,
    data: unknown,
    options?: unknown,
  ): Promise<void>;
  export function updateDoc(reference: unknown, data: unknown): Promise<void>;
  export function deleteDoc(reference: unknown): Promise<void>;
  export function addDoc(reference: unknown, data: unknown): Promise<any>;
  export function query(reference: unknown, ...constraints: unknown[]): unknown;
  export function where(field: string, op: string, value: unknown): unknown;
  export function orderBy(field: string, dir?: "asc" | "desc"): unknown;
  export function limit(n: number): unknown;
  export function initializeFirestore(...args: unknown[]): unknown;
  export function persistentLocalCache(...args: unknown[]): unknown;
  export function persistentMultipleTabManager(...args: unknown[]): unknown;
  export function connectFirestoreEmulator(...args: unknown[]): unknown;
  export function getFirestore(...args: unknown[]): unknown;

  export function writeBatch(firestore: unknown): unknown;
  export function arrayUnion(...elements: unknown[]): unknown;
  export class Timestamp {
    static now(): Timestamp;
    static fromDate(date: Date): Timestamp;
    toDate(): Date;
    seconds: number;
    nanoseconds: number;
  }
}

declare module "firebase/functions" {
  export function getFunctions(
    app?: unknown,
    regionOrCustomDomain?: string,
  ): unknown;
  export function connectFunctionsEmulator(
    functionsInstance: unknown,
    host: string,
    port: number,
  ): void;
  export function httpsCallable<RequestData = any, ResponseData = any>(
    functionsInstance: unknown,
    name: string,
    options?: unknown,
  ): (data?: RequestData) => Promise<{ data: ResponseData }>;
}
