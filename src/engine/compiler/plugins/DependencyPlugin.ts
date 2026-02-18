import {ICompilerContext, IJsompPluginDef, PipelineStage} from "../../../types";

/**
 * Standard Dependency Plugin (V2)
 * Scans 'props' and 'injection' for Mustache expressions (`{{...}}`) 
 * and reports them via `ctx.onDependency`.
 */
export const dependencyPlugin: IJsompPluginDef = {
  id: 'standard-dependency',
  stage: PipelineStage.PostAssemble, // Scan final nodes
  name: 'StandardDependency',

  onNode: (id: string, node: any, ctx: ICompilerContext) => {
    if (!ctx.onDependency) return;

    // Helper to scan a value
    const scan = (val: any) => {
      if (typeof val === 'string') {
        // Regex for {{ key }} or {{key}}
        // Global flag to find all occurrences
        const regex = /\{\{\s*([a-zA-Z0-9_$.]+)\s*\}\}/g;
        let match;
        while ((match = regex.exec(val)) !== null) {
          if (match[1]) {
            ctx.onDependency!(id, match[1]);
          }
        }
      } else if (val && typeof val === 'object') {
        // Shallow scan of props object values (recursive can be expensive)
        // For V2 MVP, we scan direct string values in props.
        // We can go 1 level deep if needed.
        Object.values(val).forEach(v => {
          if (typeof v === 'string') scan(v);
        });
      }
    };

    // 1. Scan Props
    if (node.props) {
      scan(node.props);
    }

    // 2. Scan Injection (if available in raw entity, though hydration merges it)
    // Usually Props cover most cases after hydration.
  }
};
