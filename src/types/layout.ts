import {IJsompNode, JsompHierarchyNode, JsompHierarchyOptions} from './node';

/** @internal Helper to force TS to resolve/prettify mapped types for IDE IntelliSense */
type _ResolvePath<T> = {[K in keyof T]: T[K]} & {};

/** @internal Internal recursive node for PathProxy */
type _RecursivePathNode<Nodes extends readonly IJsompNode[], Node extends IJsompNode> = {
  /** Returns the final dot-joined path string */
  $: string;
} & {
  [K in Nodes[number]as K extends {parent: Node['id']} ? K['id'] : never]: _RecursivePathNode<Nodes, K>;
};

/**
 * Type-safe path chain proxy
 * Supports recursive inference from 'as const' layout arrays.
 */
export type PathProxy<T> = T extends readonly IJsompNode[]
  ? _ResolvePath<{
    [K in T[number]as K extends {parent: string} ? never : K['id']]: _RecursivePathNode<T, K>;
  }>
  : any;

/**
 * LayoutManager interface
 */
export interface IJsompLayoutManager<TId extends string = string, TLayout extends readonly IJsompNode[] = any> {
  /** Get all nodes matching the ID, each with its calculated _fullPath */
  getNodes(id: TId): Array<IJsompNode & {_fullPath: string}>;
  /** Calculates the full path of a specific node */
  getNodePath(node: IJsompNode): string;
  /** Get all valid full paths in the layout */
  getAllPaths(): string[];
  /** Get the topological hierarchy tree */
  getHierarchy(options?: JsompHierarchyOptions): JsompHierarchyNode;
  /** Type-safe path chain proxy */
  readonly path: PathProxy<TLayout>;
}
