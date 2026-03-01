declare module 'firebase/firestore' {
  export function collection(firestore: any, ...pathSegments: string[]): any;
  export function doc(firestore: any, ...pathSegments: string[]): any;
  export function getDoc(reference: any): Promise<any>;
  export function getDocs(query: any): Promise<any>;
  export function setDoc(reference: any, data: any, options?: any): Promise<void>;
  export function updateDoc(reference: any, data: any): Promise<void>;
  export function deleteDoc(reference: any): Promise<void>;
  export function addDoc(reference: any, data: any): Promise<any>;
  export function query(reference: any, ...constraints: any[]): any;
  export function where(field: string, op: string, value: any): any;
  export function orderBy(field: string, dir?: 'asc' | 'desc'): any;
  export function limit(n: number): any;
  export function initializeFirestore(...args: any[]): any;
  export function persistentLocalCache(...args: any[]): any;
  export function persistentMultipleTabManager(...args: any[]): any;
  export function connectFirestoreEmulator(...args: any[]): any;
  export function getFirestore(...args: any[]): any;
  
  export function writeBatch(firestore: any): any;
  export function arrayUnion(...elements: any[]): any;
  export class Timestamp {
    static now(): Timestamp;
    static fromDate(date: Date): Timestamp;
    toDate(): Date;
    seconds: number;
    nanoseconds: number;
  }
}

declare module 'firebase/functions' {
  export function getFunctions(app?: any, regionOrCustomDomain?: string): any;
  export function connectFunctionsEmulator(functionsInstance: any, host: string, port: number): void;
  export function httpsCallable<RequestData = any, ResponseData = any>(
    functionsInstance: any, 
    name: string, 
    options?: any
  ): (data?: RequestData) => Promise<{ data: ResponseData }>;
}
