import { buttonLabPackage, controlsExamplesPackage } from '../../src/controls-examples';
export default {
  components: [...buttonLabPackage.components, ...controlsExamplesPackage.components],
  resources: [...buttonLabPackage.resources, ...controlsExamplesPackage.resources],
};
