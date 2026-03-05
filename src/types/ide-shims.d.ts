
// This file is intended to assist the IDE with type resolution for modules that are
// reported as missing, even when `npm run typecheck` passes.
// It acts as a fallback declaration.

// Fix for: "Module '@hello-pangea/dnd' ... not found"
declare module '@hello-pangea/dnd' {
    export * from '@hello-pangea/dnd';
    // Fallback if @hello-pangea/dnd types aren't perfect match or available
    export const Draggable: unknown;
    export const Droppable: unknown;
    export const DragDropContext: unknown;
    export const DroppableProvided: unknown;
    export const DraggableProvided: unknown;
    export const DraggableStateSnapshot: unknown;
    export const DroppableStateSnapshot: unknown;
    export const DropResult: unknown;
}

// Fix for: "Module 'firebase/storage' ... not found"
declare module 'firebase/storage' {
    export function getStorage(app?: unknown, bucketUrl?: string): unknown;
    export function ref(storage: unknown, url?: string): unknown; // url or path
    export function getDownloadURL(ref: unknown): Promise<string>;
    export function uploadBytes(ref: unknown, data: Blob | Uint8Array | ArrayBuffer, metadata?: unknown): Promise<any>;
    export function uploadBytesResumable(ref: unknown, data: Blob | Uint8Array | ArrayBuffer, metadata?: unknown): unknown;
    export function deleteObject(ref: unknown): Promise<void>;
}

// Fix for: "Module 'firebase/firestore' ... not found"
declare module 'firebase/firestore' {
    export class Timestamp {
        static now(): Timestamp;
        static fromDate(date: Date): Timestamp;
        static fromMillis(milliseconds: number): Timestamp;
        seconds: number;
        nanoseconds: number;
        toDate(): Date;
        toMillis(): number;
        isEqual(other: Timestamp): boolean;
        valueOf(): string;
        toJSON(): { seconds: number; nanoseconds: number };
    }
    // Add other firestore exports if needed, but Timestamp is the main one used in types/index.ts
    export function getFirestore(app?: unknown): unknown;
    // ... add more as discovered missing
}

