
import {IJsompNode, VisualDescriptor, PipelineContext, TraitProcessor, TraitOption} from '../../types';

/**
 * JSOMP Trait Pipeline
 * Orchestrates the transformation of raw IJsompNode to VisualDescriptor using a sequence of traits.
 */
export class TraitPipeline {
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
      componentType: node.type,
      props: {},
      styles: {},
      slots: {} // To be populated by SlotTrait
    };

    // 4. Prepare Context for next level
    const nextContext: PipelineContext = {
      ...context,
      depth: currentDepth + 1
    };

    // 5. Execution Pipeline
    for (const {processor} of this.traits) {
      try {
        processor(node, descriptor, nextContext);
      } catch (e) {
        console.error(`Error in trait for node ${node.id}:`, e);
        // Fallback or rethrow? 
        // For robustness, maybe log and continue or mark descriptor as error
        descriptor.props['__error'] = (e as Error).message;
      }
    }

    // 6. Update Cache
    this.descriptorCache.set(node.id, descriptor);

    return descriptor;
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
