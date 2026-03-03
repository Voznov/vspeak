import { ApiExtraModels, ApiProperty, type ApiPropertyOptions, refs } from '@nestjs/swagger';
import { type SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { mapValues } from 'radash';
import { z } from 'zod';
import { isZodDtoClass, type ZodDtoClass } from './base';

export type ZodDtoMarkedSchema = z.ZodType & { _zodDto: Function };

const schemaObjectToApiPropertyOptions = (so: SchemaObject, selfRequired: boolean): ApiPropertyOptions => {
  if ('oneOf' in so || 'anyOf' in so || 'allOf' in so) {
    return { ...so, type: Array, required: selfRequired };
  }

  return { ...so, required: selfRequired } as ApiPropertyOptions;
};

const decoratedDtoClasses = new Set<ZodDtoClass>();

export const applySwaggerDecorators = (schema: z.core.$ZodType): { so: SchemaObject; selfRequired: boolean; innerSchemas: Set<ZodDtoClass> } => {
  if (schema instanceof z.ZodObject) {
    if (isZodDtoClass(schema) && decoratedDtoClasses.has(schema)) {
      return { so: { oneOf: refs(schema) }, selfRequired: true, innerSchemas: new Set([schema]) };
    }

    const properties: Record<string, SchemaObject> = {};
    const required: string[] = [];
    const innerSchemas = new Set<ZodDtoClass>();
    Object.entries(schema.shape).forEach(([key, fieldSchema]) => {
      const { so, selfRequired, innerSchemas: innerSchemas_ } = applySwaggerDecorators(fieldSchema as z.ZodType);
      properties[key] = so;
      innerSchemas_.forEach((innerSchema) => innerSchemas.add(innerSchema));
      if (selfRequired) {
        required.push(key);
      }
    });

    if (isZodDtoClass(schema)) {
      decoratedDtoClasses.add(schema);
      for (const [key, propertySo] of Object.entries(properties)) {
        ApiProperty(schemaObjectToApiPropertyOptions(propertySo, required.includes(key)))(schema.prototype, key);
      }
      ApiExtraModels(...[...innerSchemas.values()].filter((innerSchema) => innerSchema !== schema))(schema);

      return { so: { oneOf: refs(schema) }, selfRequired: true, innerSchemas: new Set([schema]) };
    }

    return { so: { type: 'object', properties: mapValues(properties, (so) => (so.oneOf?.length === 1 ? so.oneOf[0] : so)), required }, selfRequired: true, innerSchemas };
  }

  if (schema instanceof z.ZodOptional) {
    return { ...applySwaggerDecorators(schema.unwrap()), selfRequired: false };
  }

  if (schema instanceof z.ZodArray) {
    const element = schema.unwrap();
    const { so, selfRequired: selfRequiredElement, innerSchemas } = applySwaggerDecorators(element);
    if (!selfRequiredElement) {
      throw 'Not required array item is not supported in Swagger. Use nullable instead.';
    }

    return { so: { type: 'array', items: so.oneOf?.length === 1 ? so.oneOf[0] : so }, selfRequired: true, innerSchemas };
  }

  if (schema instanceof z.ZodNullable) {
    const result = applySwaggerDecorators(schema.unwrap());

    return { ...result, so: { ...result.so, nullable: true } };
  }

  if (schema instanceof z.ZodPipe) {
    return applySwaggerDecorators(schema.in);
  }

  // ZodString: plain z.string(). ZodStringFormat: z.email(), z.uuid(), z.url(), z.ipv4(), etc.
  // Both share the same properties (minLength, maxLength, format).
  if (schema instanceof z.ZodString || schema instanceof z.ZodStringFormat) {
    const so: SchemaObject = { type: 'string' };
    if (schema.minLength !== null) so.minLength = schema.minLength;
    if (schema.maxLength !== null) so.maxLength = schema.maxLength;
    const fmt = schema.format;
    if (fmt !== null) {
      if (fmt === 'regex') {
        // Grab the first regex pattern from the internal bag.
        const patterns = schema._zod.bag.patterns;
        const first = patterns ? [...patterns][0] : undefined;
        if (first) so.pattern = first.source;
      } else {
        so.format = fmt;
      }
    }

    return { so, selfRequired: true, innerSchemas: new Set() };
  }

  // Number and integer subtypes (ZodInt, ZodNumberFormat, etc.) — all instanceof ZodNumber.
  if (schema instanceof z.ZodNumber) {
    const fmt = schema.format;
    const isInt = fmt === 'int32' || fmt === 'uint32' || fmt === 'safeint';
    const so: SchemaObject = { type: isInt ? 'integer' : 'number' };
    if (schema.minValue !== null && schema.minValue !== Number.MIN_SAFE_INTEGER) so.minimum = schema.minValue;
    if (schema.maxValue !== null && schema.maxValue !== Number.MAX_SAFE_INTEGER) so.maximum = schema.maxValue;

    return { so, selfRequired: true, innerSchemas: new Set() };
  }

  if (schema instanceof z.ZodBoolean) {
    return { so: { type: 'boolean' }, selfRequired: true, innerSchemas: new Set() };
  }

  if (schema instanceof z.ZodEnum) {
    return { so: { enum: schema.options }, selfRequired: true, innerSchemas: new Set() };
  }

  if (schema instanceof z.ZodLiteral) {
    return { so: { enum: [...schema.values] }, selfRequired: true, innerSchemas: new Set() };
  }

  if (schema instanceof z.ZodUnion) {
    const innerSchemas = new Set<ZodDtoClass>();
    const oneOf = schema.options.map((option) => {
      const { so, selfRequired, innerSchemas: innerSchemas_ } = applySwaggerDecorators(option);

      if (!selfRequired) {
        throw 'Not required option in oneOf is not supported in Swagger. Use nullable instead.';
      }

      innerSchemas_.forEach((innerSchema) => innerSchemas.add(innerSchema));

      // Flatten { oneOf: [single_ref] } → just the ref, so union of DTO refs stays clean.
      return so.oneOf?.length === 1 ? so.oneOf[0] : so;
    });

    return { so: { oneOf }, selfRequired: true, innerSchemas };
  }

  throw new Error(`applySwaggerDecorators: unsupported Zod type "${(schema as z.ZodType).def.type}"`);
};
