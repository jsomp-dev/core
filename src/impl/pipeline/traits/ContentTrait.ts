import {IJsompNode, PipelineContext, TraitProcessor, VisualDescriptor} from "@/types";

/**
 * Standard Content Trait (Mustache)
 * Resolves content using context.resolver and caching.
 * Implements "Mustache Cache" strategy: Key = NodeID + AtomVersion
 */
export const contentTrait: TraitProcessor = (
  node: IJsompNode,
  descriptor: VisualDescriptor,
  context: PipelineContext
) => {
  const rawContent = node.props && node.props.content;

  // If no content, do nothing
  if (!rawContent || typeof rawContent !== 'string') {
    return;
  }

  // If no resolver, pass raw content
  if (!context.resolver) {
    descriptor.props.content = rawContent;
    return;
  }

  // No explicit caching here relying on node version, because content depends on external atoms.
  // We rely on TraitPipeline descriptor cache which is invalidated by dirtyIds.

  // Cache miss - Resolve
  // We pass nodeId to resolve() so it can potentially track dependencies or use context
  const resolved = context.resolver.resolve(rawContent, {nodeId: node.id});

  descriptor.props.content = resolved;
};