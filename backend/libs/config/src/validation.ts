import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3000),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('2h'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  DINGTALK_OAUTH_CLIENT_ID: Joi.string().allow('').default(''),
  DINGTALK_OAUTH_CLIENT_SECRET: Joi.string().allow('').default(''),
  DINGTALK_OAUTH_REDIRECT_URI: Joi.string().uri().allow('').default(''),
  DINGTALK_OAUTH_SCOPES: Joi.string().default('openid'),
  DINGTALK_OAUTH_DEBUG: Joi.string().valid('true', 'false').default('false'),
  EIMS_FRONTEND_URL: Joi.string().uri().default('http://localhost:9527'),
});
