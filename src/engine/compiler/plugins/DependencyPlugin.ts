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
        // Added support for hyphens '-' and more characters in atom keys.
        // Also made regex globally searchable.
        const regex = /\{\{\s*([a-zA-Z0-9_$.-]+)\s*\}\}/g;
        let match;
        while ((match = regex.exec(val)) !== null) {
          if (match[1]) {
            ctx.onDependency!(id, match[1].trim());
          }
        }
      } else if (val && typeof val === 'object') {
        // [FIX] Recursive scan for lists (style_tw) and complex props.
        Object.values(val).forEach(v => {
          scan(v);
        });
      }
    };

    // 1. Scan Props
    if (node.props) {
      scan(node.props);
    }

    // 2. Scan Styles (Critical for reactive visual states)
    if (node.style_tw) {
      scan(node.style_tw);
    }
    if (node.style_css) {
      scan(node.style_css);
    }

    // 3. Scan Injection (if available in raw entity, though hydration merges it)
    // Usually Props cover most cases after hydration.
  }
};
