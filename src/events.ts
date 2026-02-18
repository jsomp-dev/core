import {IJsompNode, IJsompLayoutManager} from './types';

// TODO: Impl Event System

/**
 * Base JSOMP Event
 */
export interface JsompEvent {
  readonly timestamp: number;
}

/**
 * Cancellable Event (Will-style)
 * Used for pre-action events that can be intercepted.
 */
export class CancellableEvent implements JsompEvent {
  readonly timestamp: number = Date.now();
  private _defaultPrevented: boolean = false;

  get defaultPrevented(): boolean {
    return this._defaultPrevented;
  }

  /**
   * Prevents the core action from proceeding
   */
  preventDefault(): void {
    this._defaultPrevented = true;
  }
}

/**
 * Standard Notification Event (Did-style)
 * Used for post-action notifications.
 */
export class DidEvent implements JsompEvent {
  readonly timestamp: number = Date.now();
}

/**
 * Navigation Event Payload
 */
export interface NavigateEvent {
  url: string;
}


/**
 * Render Event Payload
 * Occurs when the renderer completes building the view.
 */
export interface RenderEvent {
  /** Root node ID of the rendering result */
  rootId: string;
  /** Number of successfully rendered nodes in this snapshot */
  nodeCount: number;
  /** [NEW] The fully calculated nodes array */
  nodes: IJsompNode[];
  /** [NEW] The layout manager for this rendering cycle */
  layout: IJsompLayoutManager;
}

/**
 * Interaction Event Payload
 * Occurs when user interacts with rendered UI components (e.g., Click, Hover).
 */
export interface InteractEvent {
  /** ID of the atomic node that triggered the interaction */
  nodeId: string;
  /** 
   * Full path of the node in the UI tree 
   * Format: <RootID>.<ParentID>.<ChildID>
   */
  path: string;
  /** Interaction type, e.g., "click", "submit", "change" */
  type: string;
  /** Raw interaction payload (e.g., input value, mouse event data) */
  payload?: any;
}

/**
 * Core Event Types Mapping
 */
export type JsompEventMap = {
  // Navigation
  'will-navigate': NavigateEvent & CancellableEvent;
  'did-navigate': NavigateEvent & DidEvent;

  // Lifecycle
  'will-render': {rootId: string} & CancellableEvent;
  'did-render': RenderEvent & DidEvent;

  // Interaction
  'will-interact': InteractEvent & CancellableEvent;
  'did-interact': InteractEvent & DidEvent;

  // Extension point for custom events
  [key: string]: any;
};
