import {FrameworkManifest} from "../../types";

/**
 * React framework manifest declaration.
 */
export const reactFrameworkManifest = {
  id: 'react',
  name: 'React',
  peerDependencies: {
    'react': '>=18.0.0 || >=19.0.0',
    'react-dom': '>=18.0.0 || >=19.0.0'
  },
  priority: 100,
  factory: async () => {
    const {ReactFrameworkAdapter} = await import('../react/ReactFrameworkAdapter');
    return new ReactFrameworkAdapter();
  }
};

/**
 * Framework manifest declarations.
 * These manifest is used by the FrameworkLoader to register adapters.
 */
export const BuiltInFrameworkList: FrameworkManifest[] = [
  reactFrameworkManifest
]