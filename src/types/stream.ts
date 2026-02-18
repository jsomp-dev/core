import {IAtomRegistry} from './state';

/**
 * Stream transformation plugin: used for TOON decoding, decompression, etc.
 */
export interface IStreamTransformer {
  /**
   * Process input chunk (string or Uint8Array)
   * Should return a JSON string fragment (it can be incomplete)
   */
  transform(chunk: any, context?: any): string;
}

/**
 * JSOMP Stream configuration options
 */
export interface StreamOptions {
  /** Plugin chain, e.g., [new ToonDecoder()] */
  plugins?: IStreamTransformer[];
  /** Whether to enable automatic repair/completion (default: true) */
  autoRepair?: boolean;
  /** Callback triggered when a data patch is produced */
  onPatch?: (patch: any) => void;
  /** Callback triggered when the stream ends (and the final data is flushed) */
  onFinish?: (finalData: any) => void;
  /** Atomic state registry to automatically apply patches to */
  atomRegistry?: IAtomRegistry;
}

/**
 * JSOMP Stream controller interface
 */
export interface IJsompStream {
  /** Push a data chunk into the stream */
  write(chunk: any): void;
  /** End the stream and process all remaining data */
  end(): void;
  /** Explicitly reset the stream state */
  reset(): void;
}
