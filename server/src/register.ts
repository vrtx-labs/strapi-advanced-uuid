import type { Core } from '@strapi/strapi';
import { PLUGIN_ID } from '../../admin/src/pluginId';

const register = ({ strapi }: { strapi: Core.Strapi }) => {
  // register phase
  strapi.customFields.register({
    name: 'uuid',
    plugin: PLUGIN_ID,
    type: 'uid',
  });

  const { contentTypes } = strapi;

  const models = Object.keys(contentTypes).reduce((acc, key) => {
    const contentType = contentTypes[key];

    // Filter out content types that have the custom field "plugin::strapi-advanced-uuid.uuid"
    const attributes = Object.keys(contentType.attributes).filter((attrKey) => {
      const attribute = contentType.attributes[attrKey];
      if (attribute.customField === 'plugin::strapi-advanced-uuid.uuid') {
        return true;
      }
    });

    if (attributes.length > 0) {
      return { ...acc, [key]: attributes };
    }

    return acc;
  }, {}) as { [key: string]: string[] };

  // Get the models to subscribe
  const modelsToSubscribe = Object.keys(models);

  strapi.documents.use(async (context, next) => {
    if (!modelsToSubscribe.includes(context.uid)) return next();

    if (['create', 'update', 'clone'].includes(context.action))
      await strapi.plugin(PLUGIN_ID).service('service').handleCRUDOperation(context);

    return next();
  });
};

export default register;
