var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { mergeWith, once, set } from "lodash-es";
import { z } from "zod";
import { parseEnvValue } from "./env";
const __name2 = /* @__PURE__ */ __name((target, value) => Object.defineProperty(target, "name", {
  value,
  configurable: true
}), "__name");
function typeFromShape(shape) {
  switch (shape.constructor) {
    case z.ZodString:
      return "string";
    case z.ZodNumber:
      return "float";
    case z.ZodBoolean:
      return "boolean";
    case z.ZodArray:
      return "array";
    case z.ZodObject:
      return "object";
    case z.ZodOptional:
    case z.ZodNullable:
      return typeFromShape(shape.unwrap());
    default:
      return "any";
  }
}
__name(typeFromShape, "typeFromShape");
function shapeFromType(type) {
  switch (type) {
    case "string":
      return z.string();
    case "float":
      return z.number();
    case "boolean":
      return z.boolean();
    case "integer":
      return z.number().int();
    case "array":
      return z.array(z.any());
    case "object":
      return z.object({});
    default:
      return z.any();
  }
}
__name(shapeFromType, "shapeFromType");
function typeFromSchema(schema) {
  if ("type" in schema) {
    switch (schema.type) {
      case "string":
        return "string";
      case "number":
        return "float";
      case "boolean":
        return "boolean";
      case "array":
        return "array";
      case "object":
        return "object";
    }
  }
  return "any";
}
__name(typeFromSchema, "typeFromSchema");
function schemaFromType(type) {
  switch (type) {
    case "any":
      return void 0;
    case "float":
    case "integer":
      return "number";
    default:
      return type;
  }
}
__name(schemaFromType, "schemaFromType");
function typeFromDefault(defaultValue) {
  if (Array.isArray(defaultValue)) {
    return "array";
  }
  switch (typeof defaultValue) {
    case "string":
      return "string";
    case "number":
      return "float";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    default:
      return "any";
  }
}
__name(typeFromDefault, "typeFromDefault");
function standardizeDescriptor(desc) {
  const env2 = desc.env ? Array.isArray(desc.env) ? desc.env : [desc.env, "string"] : void 0;
  let type = "any";
  if (desc.default !== void 0 && desc.default !== null) {
    type = typeFromDefault(desc.default);
  } else if (env2) {
    type = env2[1];
  } else if (desc.shape) {
    type = typeFromShape(desc.shape);
  } else if (desc.schema) {
    type = typeFromSchema(desc.schema);
  }
  const shape = desc.shape ?? shapeFromType(type);
  function validateValue(value) {
    return desc.validate ? desc.validate(value) : shape.safeParse(value);
  }
  __name(validateValue, "validateValue");
  return {
    desc: desc.desc,
    default: desc.default,
    type,
    validate: validateValue,
    env: env2,
    link: desc.link,
    schema: {
      type: schemaFromType(type),
      description: desc.desc,
      ...desc.schema
    }
  };
}
__name(standardizeDescriptor, "standardizeDescriptor");
const APP_CONFIG_DESCRIPTORS = {};
const getDescriptors = once(() => {
  return Object.entries(APP_CONFIG_DESCRIPTORS).map(
    ([module, descriptors]) => ({
      module,
      descriptors: Object.entries(descriptors).map(([key, descriptor]) => ({
        key,
        descriptor
      }))
    })
  );
});
function defineModuleConfig(module, defs) {
  const descriptors = {};
  Object.entries(defs).forEach(([key, desc]) => {
    descriptors[key] = standardizeDescriptor(
      desc
    );
  });
  APP_CONFIG_DESCRIPTORS[module] = {
    ...APP_CONFIG_DESCRIPTORS[module],
    ...descriptors
  };
}
__name(defineModuleConfig, "defineModuleConfig");
const CONFIG_JSON_PATHS = [
  join(env.projectRoot, "config.json"),
  `${homedir()}/.affine/config/config.json`
];
function readConfigJSONOverrides(path) {
  const overrides = {};
  if (existsSync(path)) {
    try {
      const config = JSON.parse(readFileSync(path, "utf-8"));
      Object.entries(config).forEach(([key, value]) => {
        if (key === "$schema") {
          return;
        }
        Object.entries(value).forEach(([k, v]) => {
          set(overrides, `${key}.${k}`, v);
        });
      });
    } catch (e) {
      console.error("Invalid json config file", e);
    }
  }
  return overrides;
}
__name(readConfigJSONOverrides, "readConfigJSONOverrides");
function override(config, update) {
  Object.keys(update).forEach((module) => {
    const moduleDescriptors = APP_CONFIG_DESCRIPTORS[module];
    if (!moduleDescriptors) {
      return;
    }
    const configKeys = new Set(Object.keys(moduleDescriptors));
    const moduleConfig = config[module];
    const moduleOverrides = update[module];
    const merge = /* @__PURE__ */ __name((left, right, path = "") => {
      if (configKeys.has(path)) {
        return right;
      }
      if (typeof right !== "object") {
        return left;
      }
      return mergeWith(left, right, (left2, right2, key) => {
        return merge(left2, right2, path === "" ? key : `${path}.${key}`);
      });
    }, "merge");
    config[module] = merge(moduleConfig, moduleOverrides);
  });
}
__name(override, "override");
function getDefaultConfig() {
  const config = {};
  const envs = process.env;
  for (const [module, defs] of Object.entries(APP_CONFIG_DESCRIPTORS)) {
    const modulizedConfig = {};
    for (const [key, desc] of Object.entries(defs)) {
      let defaultValue = desc.default;
      if (desc.env) {
        const [env2, parser] = desc.env;
        const envValue = envs[env2];
        if (envValue) {
          defaultValue = parseEnvValue(envValue, parser);
        }
      }
      const { success, error } = desc.validate(defaultValue);
      if (!success) {
        throw new Error(
          error.issues.map((issue) => {
            return `Invalid config for module [${module}] with key [${key}]
Value: ${JSON.stringify(defaultValue)}
Error: ${issue.message}`;
          }).join("\n")
        );
      }
      set(modulizedConfig, key, defaultValue);
    }
    config[module] = modulizedConfig;
  }
  CONFIG_JSON_PATHS.forEach((path) => {
    const overrides = readConfigJSONOverrides(path);
    override(config, overrides);
  });
  return config;
}
__name(getDefaultConfig, "getDefaultConfig");
export {
  APP_CONFIG_DESCRIPTORS,
  defineModuleConfig,
  getDefaultConfig,
  getDescriptors,
  override
};
