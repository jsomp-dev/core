import {BindingResolver} from "../../state";
import {IAtomRegistry} from "../../types";

export interface Operator {
  opType: string;
  target?: any;
  value?: any;
  test?: any;
  then?: any;
  else?: any;
  cases?: Array<{value: any, return: any}>;
  default?: any;
  steps?: Operator[];
  [key: string]: any;
}

/**
 * JSOMP Operator Engine
 * 
 * Responsible for evaluating declarative operation expressions in pure headless mode.
 * Supports logic, arithmetic, branching, and pipelines.
 */
export class OperatorEngine {
  /**
   * Evaluate an operator expression within a given registry context.
   */
  public static evaluate(op: Operator, registry: IAtomRegistry, pathStack?: string[], context: any = {}): any {
    const { opType } = op;
    
    // 1. Resolve initial target value
    // Target itself could be a literal, a {{mustache}} string, or another operator (nested)
    // If target is missing and we have a pipeline context ($value), use it.
    let targetValue = op.target;
    if (targetValue === undefined && context && context.$value !== undefined) {
      targetValue = context.$value;
    } else if (this.isOperator(targetValue)) {
      targetValue = this.evaluate(targetValue, registry, pathStack, context);
    } else {
      targetValue = BindingResolver.resolve(targetValue, registry, pathStack);
    }
    
    // Inject pipeline context if available
    if (context && context.$value !== undefined) {
      targetValue = this.resolveValueWithInternalVars(targetValue, registry, pathStack, context);
    }

    switch (opType) {
      case 'not':
        return !targetValue;
        
      case 'add':
        return Number(targetValue) + Number(this.resolveOperand(op.value, registry, pathStack, context));
      case 'sub':
        return Number(targetValue) - Number(this.resolveOperand(op.value, registry, pathStack, context));
      case 'mult':
        return Number(targetValue) * Number(this.resolveOperand(op.value, registry, pathStack, context));
      case 'div':
        return Number(targetValue) / Number(this.resolveOperand(op.value, registry, pathStack, context));
        
      case 'if':
        const condition = this.evaluateCondition(op.test, targetValue, registry, pathStack, context);
        return condition 
          ? this.resolveOperand(op.then, registry, pathStack, context) 
          : this.resolveOperand(op.else, registry, pathStack, context);
          
      case 'match':
        if (op.cases) {
          for (const c of op.cases) {
            const caseValue = this.resolveOperand(c.value, registry, pathStack, context);
            if (targetValue === caseValue) {
              return this.resolveOperand(c.return, registry, pathStack, context);
            }
          }
        }
        return this.resolveOperand(op.default, registry, pathStack, context);
        
      case 'pipeline':
        let current = targetValue;
        if (op.steps) {
          for (const step of op.steps) {
            current = this.evaluate(step, registry, pathStack, { ...context, $value: current });
          }
        }
        return current;

      default:
        return targetValue;
    }
  }

  /**
   * Check if a value is an operator object
   */
  public static isOperator(val: any): val is Operator {
    return val && typeof val === 'object' && typeof val.opType === 'string' && !val.$$typeof;
  }

  /**
   * Helper: Resolve an operand which can be a literal, a mustache, or another operator.
   */
  private static resolveOperand(val: any, registry: IAtomRegistry, pathStack?: string[], context: any = {}): any {
    let resolved = val;
    // 1. Resolve internal variables like {{$value}} first to prevent BindingResolver from treating them as missing atoms
    if (typeof resolved === 'string' && context && context.$value !== undefined) {
       resolved = this.resolveValueWithInternalVars(resolved, registry, pathStack, context);
    }

    // 2. Resolve operators recursively 
    if (this.isOperator(resolved)) {
      return this.evaluate(resolved, registry, pathStack, context);
    }
    
    // 3. Resolve standard mustaches
    return BindingResolver.resolve(resolved, registry, pathStack);
  }

  /**
   * Resolve values that might contain special internal variables like {{$value}}
   */
  private static resolveValueWithInternalVars(val: any, registry: IAtomRegistry, pathStack?: string[], context: any = {}): any {
    if (typeof val === 'string' && val.includes('{{$value}}')) {
       // If it's a pure {{$value}}, return the typed value
       if (val.trim() === '{{$value}}') return context.$value;
       // Interpolation
       return val.replace(/\{\{\$value\}\}/g, String(context.$value));
    }
    return val;
  }

  /**
   * Evaluate a condition for 'if' operator
   */
  private static evaluateCondition(test: any, target: any, registry: IAtomRegistry, pathStack?: string[], context: any = {}): boolean {
    if (test === null || test === undefined) return !!target;
    if (typeof test === 'boolean') return test;
    
    // Check if test is an operator itself
    if (this.isOperator(test)) {
      return !!this.evaluate(test, registry, pathStack, context);
    }

    // Check for comparison object: { "compare": ">", "value": 0 }
    if (typeof test === 'object' && test.compare) {
      const compareValue = this.resolveOperand(test.value, registry, pathStack, context);
      switch (test.compare) {
        case '>': return target > compareValue;
        case '<': return target < compareValue;
        case '>=': return target >= compareValue;
        case '<=': return target <= compareValue;
        case '==': return target == compareValue;
        case '!=': return target != compareValue;
        case '===': return target === compareValue;
        case '!==': return target !== compareValue;
      }
    }

    // Default: resolve test as mustache and return its truthiness
    return !!BindingResolver.resolve(test, registry, pathStack);
  }
}
