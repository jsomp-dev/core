import {ICompilerContext, IJsompPluginDef, PipelineStage} from "../../../types";
import {OperatorEngine} from "../../operator/OperatorEngine";
import {BindingResolver} from "../../../state";

/**
 * OperatorExpressionPlugin
 * 
 * Responsible for identifying and evaluating declarative operators during compilation.
 * Stage: PreProcess
 * Mechanism: 
 * 1. Deep scans the entity attributes for objects containing 'opType'.
 * 2. Processes these objects via OperatorEngine.
 * 3. Replaces the operator object with a unique virtual interpolation string (e.g., {{__op_v1_XXXX}}).
 * 4. Injects the result into the AtomRegistry so visual traits can pick it up.
 * 5. Reports dependencies to the runtime.
 */
export const operatorExpressionPlugin: IJsompPluginDef = {
  id: 'standard-operator',
  stage: PipelineStage.PreProcess,
  name: 'StandardOperatorExpression',

  onNode(id: string, entity: any, ctx: ICompilerContext) {
    if (!ctx.atomRegistry) return;

    // Scan for operators in the entity's attributes (excluding system fields if any)
    const updates: any = {};
    let hasChanges = false;

    // Recursively find and process operators
    const processOperators = (val: any, path: string): any => {
      if (OperatorEngine.isOperator(val)) {
        // 1. Identify atom name (explicit name property OR auto-generated stable ID)
        const customName = (val as any).name;
        const opId = customName || `__op_v1_${id}_${path}`;
        const placeholder = `{{${opId}}}`;

        // 2. Report dependencies for this operator
        const deps = BindingResolver.extractKeys(val);
        deps.forEach(key => {
          // Filter out internal variables like $value
          if (key !== '$value' && !key.startsWith('__op_v1_')) {
            ctx.onDependency?.(id, key);
          }
        });

        // 3. Evaluate and store result in Registry
        const result = OperatorEngine.evaluate(val, ctx.atomRegistry!);

        // Only set if value changed to avoid triggering unnecessary re-compiles
        // when bridged to reactive systems like React.
        const current = ctx.atomRegistry!.get(opId);
        const currentVal = (current && typeof current === 'object' && 'value' in current) ? (current as any).value : current;

        if (currentVal !== result) {
          ctx.atomRegistry!.set(opId, result);
        }

        hasChanges = true;
        return placeholder;
      }

      if (Array.isArray(val)) {
        return val.map((v, i) => processOperators(v, `${path}.${i}`));
      }

      if (val && typeof val === 'object' && !val.$$typeof && !val._isAMomentObject) {
        const res: any = {};
        for (const k in val) {
          if (Object.prototype.hasOwnProperty.call(val, k)) {
            res[k] = processOperators(val[k], `${path}.${k}`);
          }
        }
        return res;
      }

      return val;
    };

    for (const key in entity) {
      if (key === 'id' || key === 'type') continue;
      const originalValue = entity[key];
      const processedValue = processOperators(originalValue, key);
      if (processedValue !== originalValue) {
        updates[key] = processedValue;
        hasChanges = true;
      }
    }

    return hasChanges ? updates : undefined;
  }
};
