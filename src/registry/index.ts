export * from './ComponentRegistry';
export * from './ActionRegistry';
export * from './SchemaRegistry';
export * from './ConfigRegistry';
export * from './EntityRegistry';
export * from './InstanceRegistry';

// Re-export FrameworkRegistry from new framework location for backward compatibility
export {FrameworkRegistry} from '../framework/core/FrameworkRegistry';
