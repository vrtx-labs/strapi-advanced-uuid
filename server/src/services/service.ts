import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';
import { generateUUID, isValidUUIDValue } from '../../../admin/src/utils/helpers';

const { YupValidationError } = errors;

const service = ({ strapi }: { strapi: Core.Strapi }) => ({
  getWelcomeMessage() {
    return 'Welcome to Strapi 🚀';
  },
  async handleCRUDOperation(context: any) {
    const errorMessages: any = {
      inner: [],
    };

    for (const attribute of Object.keys(context.contentType.attributes)) {
      if (context.contentType.attributes[attribute].customField !== 'plugin::strapi-advanced-uuid.uuid') continue;

      // Get the initial value of the attribute
      const givenValue = context.params.data ? context.params.data[attribute] : null;
      let currentValue = givenValue;

      // if we update and the attribute is not given we want to get it from the database
      if (context.action == 'update' && !givenValue) {
        const documentId = context.params.data?.documentId ? context.params.data.documentId : context.params.documentId;
        const hasDraftAndPublish = context.contentType.options?.draftAndPublish as boolean;

        //drafts should be most up to date
        const drafts = await strapi.db.query(context.uid).findMany({
          where: {
            documentId,
            publishedAt: { $null: hasDraftAndPublish },
          },
        });
        if (drafts.length <= 0) {
          strapi.log.error("Could not find original draft to determine original value of " + attribute);
          return;
        }

        currentValue = drafts[0][attribute];
      }

      // Get the options of the attribute
      const options = context.contentType.attributes
        ? context.contentType.attributes[attribute]['options']
        : null;

      // Get the uuid-format option, if it is set
      const uuidFormat = options ? options['uuid-format'] : null;
      // Get the disable-auto-fill option, if it is set
      const disableAutoFill = options ? options['disable-auto-fill'] : false;

      // If there is no initial value and disableAutoFill is not enabled, generate a new UUID
      if (!currentValue && !disableAutoFill) {
        const newUUID = generateUUID(uuidFormat);
        if (!context.params.data)
          context.params['data'] = {};
        context.params.data[attribute] = newUUID;

        currentValue = newUUID;

        // Validation happens on following conditions:
        // - If disableAutoFill is not enabled
        // - If there is an initial value
        if (!disableAutoFill || currentValue) {
          if (!isValidUUIDValue(uuidFormat, currentValue)) {
            errorMessages.inner.push({
              name: 'ValidationError', // Always set to ValidationError
              path: attribute, // Name of field we want to show input validation on
              message: 'The UUID format is invalid.', // Input validation message
            });
          }
        }
      }
    }

    if (errorMessages.inner.length > 0) {
      throw new YupValidationError(errorMessages, 'You have some issues');
    }
  },
});

export default service;
