const Joi = require('joi');

const schemas = {
  register: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
    name: Joi.string().trim().min(1).max(100).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  profileUpdate: Joi.object({
    name: Joi.string().trim().min(1).max(100),
    currentPassword: Joi.string(),
    newPassword: Joi.string().min(6).max(128),
  }).min(1),

  createInstance: Joi.object({
    type: Joi.string().valid('lxc').required(),
    name: Joi.string().trim().min(1).max(64).pattern(/^[a-zA-Z0-9_-]+$/).required(),
    cpus: Joi.number().integer().min(1).max(32).default(1),
    memory: Joi.number().integer().min(64).max(131072).default(1024),
    disk: Joi.number().integer().min(1).max(1000).default(8),
    ostemplate: Joi.string().required(),
    storage: Joi.string().default('local-lvm'),
    bridge: Joi.string().default('vmbr0'),
    password: Joi.string().min(1).max(64).default('changeme'),
    net: Joi.string(),
  }).options({ stripUnknown: true }),

  resizeInstance: Joi.object({
    cpus: Joi.number().integer().min(1).max(32),
    memory: Joi.number().integer().min(64).max(131072),
    disk: Joi.number().integer().min(1).max(1000),
  }).min(1).options({ stripUnknown: true }),

  createSnapshot: Joi.object({
    snapname: Joi.string().trim().min(1).max(64).required(),
    description: Joi.string().max(256).allow(''),
  }).options({ stripUnknown: true }),
};

function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    if (!schema) return next();

    const { error, value } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({ error: messages.join('; ') });
    }
    req.body = value;
    next();
  };
}

module.exports = { validate, schemas };
