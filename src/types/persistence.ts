import type { SceneSnapshot, WorldId } from './game';

export interface Creation {
  id: string;
  worldId: WorldId;
  name: string;
  createdAt: number;
  updatedAt: number;
  snapshot: SceneSnapshot;
  thumbnail: Blob | null;
}

/** Lightweight listing entry (no snapshot payload). */
export interface CreationSummary {
  id: string;
  worldId: WorldId;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnail: Blob | null;
}

export interface AutosaveRecord {
  worldId: WorldId;
  snapshot: SceneSnapshot;
  updatedAt: number;
}

export type StorageErrorKind = 'unavailable' | 'quota' | 'not-found' | 'invalid' | 'unknown';

export class StorageError extends Error {
  constructor(public readonly kind: StorageErrorKind, message: string) {
    super(message);
    this.name = 'StorageError';
  }
}
