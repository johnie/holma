import { htmlEscape } from 'escape-goat';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import { SchemaError } from '@standard-schema/utils';

export class MissingValueError extends Error {
  public readonly key?: string;
  constructor(key?: string) {
    super(
      `Missing a value for ${key ? `the placeholder: ${key}` : 'a placeholder'}`
    );
    this.name = 'MissingValueError';
    this.key = key;
  }
}

async function validateSchema<T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>
): Promise<StandardSchemaV1.InferOutput<T>> {
  let result = schema['~standard'].validate(input);
  if (result instanceof Promise) {
    result = await result;
  }
  if (result.issues) {
    throw new SchemaError(result.issues);
  }
  return result.value;
}

function getNestedValue(obj: unknown, path: string): unknown {
  let value: unknown = obj;

  for (const part of path.split('.')) {
    if (value == null) {
      return undefined;
    }

    if (typeof value === 'object') {
      value = (value as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return value;
}

export interface HolmaOptions {
  ignoreMissing?: boolean;
  transform?: (args: { value: unknown; key: string }) => unknown;
}

export async function holma<T extends StandardSchemaV1>({
  template,
  data,
  schema,
  options = {},
}: {
  template: string;
  schema: T;
  data: StandardSchemaV1.InferInput<T>;
  options?: HolmaOptions;
}): Promise<string> {
  if (typeof template !== 'string') {
    throw new TypeError(
      `Expected a \`string\` for template, got \`${typeof template}\``
    );
  }

  const safeData = await validateSchema(schema, data);

  const replace = (placeholder: string, key: string): string => {
    const value = getNestedValue(safeData, key);
    const transformed = options.transform
      ? options.transform({ value, key })
      : value;

    if (transformed === undefined) {
      if (options.ignoreMissing) return placeholder;
      throw new MissingValueError(key);
    }

    return String(transformed);
  };

  const withEscape =
    (fn: typeof replace) =>
    (...args: Parameters<typeof replace>) =>
      htmlEscape(fn(...args));

  const doubleBraces = /{{(\d+|[a-z$_][\w\-$]*(?:\.[\w\-$]*)*)}}/gi;
  const singleBraces = /{(\d+|[a-z$_][\w\-$]*(?:\.[\w\-$]*)*)}/gi;

  let result = template;

  if (doubleBraces.test(result)) {
    result = result.replace(doubleBraces, withEscape(replace));
  }

  return result.replace(singleBraces, replace);
}
