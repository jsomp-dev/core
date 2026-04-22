import {IJsompNode, ITraitPipeline, PipelineContext, TraitOption, TraitProcessor, VisualDescriptor} from '../../types';

/**
 * JSOMP Trait Pipeline
 * Orchestrates the transformation of raw IJsompNode to VisualDescriptor using a sequence of traits.
 */
export class TraitPipeline implements ITraitPipeline {
  private traits: Array<{processor: TraitProcessor; options: TraitOption}> = [];

  // Internal cache for VisualDescriptors: NodeID -> Descriptor
  private descriptorCache = new Map<string, VisualDescriptor>();

  constructor() {
    // Default configuration could go here
  }

  /**
   * Register a trait processor with specific options
   */
  public registerTrait(processor: TraitProcessor, options: TraitOption): void {
    this.traits.push({processor, options});
    // Sort by priority descending (higher priority executes first)
    this.traits.sort((a, b) => b.options.priority - a.options.priority);
  }

  /**
   * Process a node and produce a VisualDescriptor
   * Handles caching, recursion depth check, and trait execution.
   */
  public processNode(node: IJsompNode, context: PipelineContext): VisualDescriptor {
    // 1. Depth Guard
    const currentDepth = context.depth || 0;
    if (currentDepth > 32) {
      return this.createErrorDescriptor(node, `Depth limit exceeded (Max 32). Cycle detected or tree too deep.`);
    }

    const cached = this.descriptorCache.get(node.id);
    if (cached) {
      if (context.dirtyIds && !context.dirtyIds.has(node.id)) {
        return cached;
      }
      // If dirtyIds is not provided, we might want to check an external version or invalidation logic.
      // For now, adhering to the plan: explicit dirty check overrides cache.
    }

    // 3. Initialize Descriptor
    const descriptor: VisualDescriptor = {
      id: node.id,
      path: node._fullPath,
      componentType: node.type,
      props: {},
      styles: {},
      slots: {}, // To be populated by SlotTrait
      trackInstance: node.trackInstance
    };

    // 4. Prepare Context for next level (V1.1: Automatic Path Stack)
    // We derive the pathStack from the current node's _fullPath to provide context for children
    const currentPathStack = node._fullPath ? node._fullPath.split('.') : [];
    
    const nextContext: PipelineContext = {
      ...context,
      depth: currentDepth + 1,
      pathStack: currentPathStack
    };

    // 5. Execution Pipeline
    for (const {processor} of this.traits) {
      try {
        processor(node, descriptor, nextContext);
      } catch (e) {
        console.error(`Error in trait for node ${node.id}:`, e);
        descriptor.props['__error'] = (e as Error).message;
      }
    }

    // 6. Persistence Check: If new descriptor is effectively equal to cached one, reuse the old reference.
    // This is the CRITICAL optimization to prevent React re-renders.
    if (cached) {
      if (this.isDescriptorEqual(cached, descriptor)) {
        return cached;
      }
    }

    // 7. Update Cache
    this.descriptorCache.set(node.id, descriptor);

    return descriptor;
  }

  /**
   * Deep compare two descriptors to ensure reference stability
   */
  private isDescriptorEqual(a: VisualDescriptor, b: VisualDescriptor): boolean {
    // Basic checks
    if (a.componentType !== b.componentType) return false;
    if (a.path !== b.path) return false;
    if (a.trackInstance !== b.trackInstance) return false;

    // Props check (Shallow enough for most cases, but JSOMP props can be nested)
    if (!this.isDeepEqual(a.props, b.props)) return false;
    
    // Styles check
    if (!this.isDeepEqual(a.styles, b.styles)) return false;

    // Slots check
    const slotNamesA = Object.keys(a.slots);
    const slotNamesB = Object.keys(b.slots);
    if (slotNamesA.length !== slotNamesB.length) return false;
    for (const name of slotNamesA) {
      const idsA = a.slots[name];
      const idsB = b.slots[name];
      if (idsA.length !== idsB.length) return false;
      for (let i = 0; i < idsA.length; i++) {
        if (idsA[i] !== idsB[i]) return false;
      }
    }

    return true;
  }

  private isDeepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    // For JSOMP performance, we treat functions as equal during descriptor comparison
    // because we use stable event delegation in the renderer.
    if (typeof a === 'function' && typeof b === 'function') return true;

    if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!this.isDeepEqual(a[key], b[key])) return false;
    }
    return true;
  }


  /**
   * Explicitly invalidate cache for specific IDs
   */
  public invalidate(ids: string[]): void {
    for (const id of ids) {
      this.descriptorCache.delete(id);
    }
  }

  /**
   * Clear entire cache
   */
  public clearCache(): void {
    this.descriptorCache.clear();
  }

  /**
   * Get a descriptor from cache directly
   */
  public getDescriptor(id: string): VisualDescriptor | undefined {
    return this.descriptorCache.get(id);
  }

  private createErrorDescriptor(node: IJsompNode, msg: string): VisualDescriptor {
    return {
      id: node.id,
      componentType: 'Error',
      props: {message: msg},
      styles: {border: '2px solid red', color: 'red', padding: '10px'},
      slots: {}
    };
  }
}
