import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { generateUUID, isValidUUIDValue } from '../../../admin/src/utils/helpers';

const { YupValidationError } = errors;

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getWelcomeMessage() {
    return 'Welcome to Strapi 🚀';
  },
  handleCRUDOperation(context: any) {
    const errorMessages: any = {
      inner: [],
    };

    for (const attribute of Object.keys(context.contentType.attributes)) {
      if (context.contentType.attributes[attribute].customField !== 'plugin::strapi-advanced-uuid.uuid') continue;

      // Get the initial value of the attribute
      let initialValue = context.params.data ? context.params.data[attribute] : null;

      // Get the options of the attribute
      const options = context.contentType.attributes
        ? context.contentType.attributes[attribute]['options']
        : null;

      // Get the uuid-format option, if it is set
      const uuidFormat = options ? options['uuid-format'] : null;
      // Get the disable-auto-fill option, if it is set
      const disableAutoFill = options ? options['disable-auto-fill'] : false;

      // If there is no initial value and disableAutoFill is not enabled, generate a new UUID
      if (!initialValue && !disableAutoFill) {
        const newUUID = generateUUID(uuidFormat);
        if (!context.params.data)
          context.params['data'] = {};
        context.params.data[attribute] = newUUID;

        initialValue = newUUID;
      }

      // Validation happens on following conditions:
      // - If disableAutoFill is not enabled
      // - If there is an initial value
      if (!disableAutoFill || initialValue) {
        if (!isValidUUIDValue(uuidFormat, initialValue)) {
          errorMessages.inner.push({
            name: 'ValidationError', // Always set to ValidationError
            path: attribute, // Name of field we want to show input validation on
            message: 'The UUID format is invalid.', // Input validation message
          });

        }
      }
    }

    if (errorMessages.inner.length > 0) {
      throw new YupValidationError(errorMessages, 'You have some issues');
    }
  },
});

export default service;
