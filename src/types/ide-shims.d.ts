
// This file is intended to assist the IDE with type resolution for modules that are
// reported as missing, even when `npm run typecheck` passes.
// It acts as a fallback declaration.

// Fix for: "Module '@hello-pangea/dnd' ... not found"
declare module '@hello-pangea/dnd' {
    export * from '@hello-pangea/dnd';
    // Fallback if @hello-pangea/dnd types aren't perfect match or available
    export const Draggable: any;
    export const Droppable: any;
    export const DragDropContext: any;
    export const DroppableProvided: any;
    export const DraggableProvided: any;
    export const DraggableStateSnapshot: any;
    export const DroppableStateSnapshot: any;
    export const DropResult: any;
}

// Fix for: "Module 'firebase/storage' ... not found"
declare module 'firebase/storage' {
    export function getStorage(app?: any, bucketUrl?: string): any;
    export function ref(storage: any, url?: string): any; // url or path
    export function getDownloadURL(ref: any): Promise<string>;
    export function uploadBytes(ref: any, data: Blob | Uint8Array | ArrayBuffer, metadata?: any): Promise<any>;
    export function uploadBytesResumable(ref: any, data: Blob | Uint8Array | ArrayBuffer, metadata?: any): any;
    export function deleteObject(ref: any): Promise<void>;
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
    export function getFirestore(app?: any): any;
    // ... add more as discovered missing
}

// Fix for: "Module 'lucide-react' has no exported member 'Star', 'Shield', etc."
// Note: We cannot easily augment "lucide-react" if it already exists as a module.
// However, declaring it again as an ambient module might merge or shadow it for the IDE.
// We only add the missing ones.
declare module 'lucide-react' {
    import {  FC, SVGProps } from 'react';
    export interface LucideProps extends SVGProps<SVGSVGElement> {
        size?: string | number;
        absoluteStrokeWidth?: boolean;
    }
    export type Icon = FC<LucideProps>;

    // Re-declare the specific missing icons
    export const Star: Icon;
    export const Shield: Icon;
    export const Minus: Icon;
    export const ExternalLink: Icon;
    
    // Fallback for everything else
    // export * from 'lucide-react/dist/lucide-react'; // Circular reference risk?
}
