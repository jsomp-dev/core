import {IJsompNode, IJsompRenderContext, IStateTrait} from "../../../types";
import {useAtom, useMustache} from "../../../hook";
import {useMemo} from "react";
import {InjectionRegistry} from "../../core/InjectionRegistry";
import {BindingResolver} from "@jsomp/core";

/**
 * useStateTrait: Handles atom subscriptions, mustache resolution, and attribute injections.
 */
export const useStateTrait = (node: IJsompNode, context: IJsompRenderContext, fullPath: string): IStateTrait => {
  const {atomRegistry} = context;

  // 1. Subscribe to Injection (Both Global ID and Full Path)
  const pathInjection = useAtom(atomRegistry, fullPath);
  const idInjection = useAtom(atomRegistry, node.id);

  // 2. Preliminary property merging (Priority: Path > ID > Static)
  const {mergedNode, injection: finalInjection} = useMemo(() => {
    const combinedInjection = {
      ...(typeof idInjection === 'object' ? idInjection : {}),
      ...(typeof pathInjection === 'object' ? pathInjection : {})
    };
    return InjectionRegistry.resolve(node, fullPath, combinedInjection);
  }, [node, pathInjection, idInjection, fullPath]);

  // 3. Mustache dynamic binding subscription
  const mustacheKeys = useMemo(() => {
    return BindingResolver.extractKeys(mergedNode);
  }, [mergedNode]);

  // When atoms corresponding to these keys change, the result here changes, driving the component update
  const mustacheValues = useMustache(atomRegistry, mustacheKeys);

  // 4. Deep resolution of Mustache bindings
  const resolvedNode = useMemo(() => {
    return BindingResolver.resolve(mergedNode, atomRegistry);
  }, [mergedNode, atomRegistry, mustacheValues]);

  return {
    resolvedNode,
    path: fullPath,
    injection: finalInjection
  };
};
