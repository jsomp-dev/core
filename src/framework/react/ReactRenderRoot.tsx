import ReactDOM from 'react-dom/client';
import {ReactRenderer} from './ReactRenderer';
import {IRenderRoot, IRuntimeAdapter} from "../../types";
import {ReactRuntimeAdapter} from './ReactRuntimeAdapter';

/**
 * ReactRenderRoot
 * Implements IRenderRoot for React — mounts/unmounts ReactRenderer into a DOM container.
 */
export class ReactRenderRoot implements IRenderRoot {
  private _container: Element;
  private _adapter: IRuntimeAdapter;
  private _components: Record<string, any>;
  private _rootId?: string;
  private _root?: ReactDOM.Root;

  constructor(
    container: Element,
    adapter: IRuntimeAdapter,
    components: Record<string, any>,
    rootId?: string
  ) {
    this._container = container;
    this._adapter = adapter;
    this._components = components;
    this._rootId = rootId;
  }

  public mount(): void {
    this._root = ReactDOM.createRoot(this._container);
    this._doRender();
  }

  public unmount(): void {
    this._root?.unmount();
  }

  public forceUpdate(): void {
    this._doRender();
  }

  private _doRender() {
    const descriptors = this._adapter.getSnapshot();
    const element = (
      <ReactRenderer
        descriptors={descriptors}
        adapter={this._adapter as ReactRuntimeAdapter}
        rootId={this._rootId}
        components={this._components}
      />
    );
    this._root?.render(element);
  }
}
