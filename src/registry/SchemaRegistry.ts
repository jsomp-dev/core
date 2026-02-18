import {ZodType} from 'zod';
import {ISchemaRegistry} from '../types';

/**
 * SchemaRegistry
 * Responsible for managing and retrieving schemas for Atoms.
 * This acts as the bridge between JSON declarations (ID/Type) and JS validators (Zod 4).
 */
export class SchemaRegistry implements ISchemaRegistry {
  private schemas = new Map<string, ZodType | any>();
  private _enabled = true;

  constructor() { }

  /**
   * Internal global singleton for the default schema registry
   */
  public static readonly global = new SchemaRegistry();

  /**
   * Toggle global validation status
   */
  public set enabled(val: boolean) {
    this._enabled = val;
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Register a schema for a specific ID or Type
   * @param key The ID (e.g., 'search.keyword') or Type name
   * @param schema The validator object (e.g., a Zod schema)
   */
  register(key: string, schema: ZodType | any) {
    this.schemas.set(key, schema);
  }

  /**
   * Get a schema by ID or Type
   */
  get(key: string): ZodType | any | undefined {
    return this.schemas.get(key);
  }

  /**
   * List all registered schemas (optimized for AI prompts)
   * Uses Zod 4 native toJSONSchema for best compatibility.
   */
  getManifest(): Record<string, any> {
    const manifest: Record<string, any> = {};
    this.schemas.forEach((schema, key) => {
      // Zod 4 native conversion
      if (schema && typeof (schema as any).toJSONSchema === 'function') {
        try {
          // AI agents usually prefer draft-07 or simpler structures
          const jsonSchema = (schema as any).toJSONSchema({
            target: 'draft-07'
          });

          // Clean up: Use destructuring to exclude $schema and internal ~standard metadata
          if (jsonSchema) {
            const {$schema, ['~standard']: _std, ...cleanSchema} = jsonSchema as any;
            manifest[key] = cleanSchema;
          }
        } catch (e) {
          console.warn(`[SchemaRegistry] Native conversion failed for ${key}:`, e);
          manifest[key] = {type: 'unknown'};
        }
      } else {
        // Fallback for non-Zod or unknown objects
        manifest[key] = {type: 'any', note: 'Not a standard Zod schema'};
      }
    });
    return manifest;
  }
}
