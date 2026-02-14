import {
  IJsompService, IJsompNode, IAtomRegistry, IComponentRegistry
} from '../types';
import {NodeRestorer} from './core/NodeRestorer';
import {AtomRegistry} from './core/AtomRegistry';
import {ComponentRegistry} from './registry/ComponentRegistry';

/**
 * JSOMP Service Implementation
 */
export class JsompService implements IJsompService {

  /**
   * Component registry
   */
  public readonly componentRegistry: IComponentRegistry = new ComponentRegistry();

  /** 
   * Global state registry
   * Business layers should inject long-term shared state here.
   */
  public readonly globalRegistry: IAtomRegistry = new AtomRegistry();

  /**
   * Create a local state scope with parent association
   * Recommended to be called when each independent page/large component is instantiated.
   */
  public createScope(): IAtomRegistry {
    return new AtomRegistry(this.globalRegistry);
  }

  /**
   * Restore tree structure from flat Map
   */
  public restoreTree(entities: Map<string, any>, rootId?: string, atomRegistry?: IAtomRegistry): IJsompNode[] {
    return NodeRestorer.restore(entities, rootId, atomRegistry);
  }

  /**
   * Flatten tree structure into flat Map
   */
  public flattenTree(nodes: IJsompNode[]): Map<string, any> {
    return NodeRestorer.flatten(nodes);
  }
}
