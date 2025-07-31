import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

export interface ValidationSchema {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}

/**
 * Validation middleware factory
 */
export const validate = (schema: ValidationSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate route parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw new AppError(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        { errors }
      );
    }

    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(1).max(255).required(),
  slug: Joi.string().pattern(/^[a-z0-9-]+$/).min(1).max(255),
  url: Joi.string().uri(),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sort: Joi.string().default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  },
};

// User validation schemas
export const userSchemas = {
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: commonSchemas.name,
  }),
  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required(),
  }),
  updateProfile: Joi.object({
    name: Joi.string().min(1).max(255),
    avatar_url: Joi.string().uri().allow(''),
    metadata: Joi.object(),
  }),
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password,
  }),
};

// Website validation schemas
export const websiteSchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    domain: Joi.string().hostname().required(),
    configuration: Joi.object().default({}),
  }),
  update: Joi.object({
    name: Joi.string().min(1).max(255),
    domain: Joi.string().hostname(),
    configuration: Joi.object(),
    is_active: Joi.boolean(),
  }),
};

// Content validation schemas
export const contentSchemas = {
  create: Joi.object({
    title: Joi.string().min(1).max(500).required(),
    slug: commonSchemas.slug,
    body: Joi.string().required(),
    excerpt: Joi.string().max(1000),
    status: Joi.string().valid('draft', 'review', 'published', 'scheduled', 'archived').default('draft'),
    scheduled_at: Joi.date().iso(),
    seo_title: Joi.string().max(255),
    seo_description: Joi.string().max(500),
    seo_keywords: Joi.string().max(500),
    featured_image_url: Joi.string().uri(),
    category_ids: Joi.array().items(commonSchemas.uuid),
    tag_ids: Joi.array().items(commonSchemas.uuid),
  }),
  update: Joi.object({
    title: Joi.string().min(1).max(500),
    slug: commonSchemas.slug,
    body: Joi.string(),
    excerpt: Joi.string().max(1000),
    status: Joi.string().valid('draft', 'review', 'published', 'scheduled', 'archived'),
    scheduled_at: Joi.date().iso().allow(null),
    seo_title: Joi.string().max(255).allow(''),
    seo_description: Joi.string().max(500).allow(''),
    seo_keywords: Joi.string().max(500).allow(''),
    featured_image_url: Joi.string().uri().allow(''),
    category_ids: Joi.array().items(commonSchemas.uuid),
    tag_ids: Joi.array().items(commonSchemas.uuid),
  }),
};

// Category validation schemas
export const categorySchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    slug: commonSchemas.slug,
    description: Joi.string().max(1000),
    parent_id: commonSchemas.uuid.allow(null),
  }),
  update: Joi.object({
    name: Joi.string().min(1).max(255),
    slug: commonSchemas.slug,
    description: Joi.string().max(1000).allow(''),
    parent_id: commonSchemas.uuid.allow(null),
  }),
};

// Tag validation schemas
export const tagSchemas = {
  create: Joi.object({
    name: commonSchemas.name,
    slug: commonSchemas.slug,
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).default('#3b82f6'),
  }),
  update: Joi.object({
    name: Joi.string().min(1).max(255),
    slug: commonSchemas.slug,
    color: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/),
  }),
};

export default {
  validate,
  commonSchemas,
  userSchemas,
  websiteSchemas,
  contentSchemas,
  categorySchemas,
  tagSchemas,
};