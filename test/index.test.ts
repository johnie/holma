import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import * as v from 'valibot';
import { holma, MissingValueError, type HolmaOptions } from '@/index';
import { SchemaError } from '@standard-schema/utils';

describe('holma', () => {
  describe('basic functionality', () => {
    it('should replace single braces with raw values', async () => {
      const schema = z.object({ name: z.string() });
      const result = await holma({
        template: 'Hello {name}!',
        schema,
        data: { name: 'World' },
      });
      expect(result).toBe('Hello World!');
    });

    it('should replace double braces with HTML-escaped values', async () => {
      const schema = z.object({ html: z.string() });
      const result = await holma({
        template: 'Content: {{html}}',
        schema,
        data: { html: '<script>alert("xss")</script>' },
      });
      expect(result).toBe(
        'Content: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should handle multiple placeholders', async () => {
      const schema = z.object({
        first: z.string(),
        last: z.string(),
      });
      const result = await holma({
        template: 'Hello {first} {last}!',
        schema,
        data: {
          first: 'John',
          last: 'Doe',
        },
      });
      expect(result).toBe('Hello John Doe!');
    });

    it('should handle mix of single and double braces', async () => {
      const schema = z.object({
        name: z.string(),
        html: z.string(),
      });
      const result = await holma({
        template: 'Hello {name}, content: {{html}}',
        schema,
        data: {
          name: 'World',
          html: '<b>bold</b>',
        },
      });
      expect(result).toBe('Hello World, content: &lt;b&gt;bold&lt;/b&gt;');
    });
  });

  describe('nested key access', () => {
    it('should access nested object properties', async () => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string(),
          }),
        }),
      });
      const result = await holma({
        template: 'Hello {user.profile.name}!',
        schema,
        data: {
          user: {
            profile: {
              name: 'Alice',
            },
          },
        },
      });
      expect(result).toBe('Hello Alice!');
    });

    it('should handle nested keys with HTML escaping', async () => {
      const schema = z.object({
        user: z.object({
          bio: z.string(),
        }),
      });
      const result = await holma({
        template: 'Bio: {{user.bio}}',
        schema,
        data: {
          user: {
            bio: '<em>Developer</em>',
          },
        },
      });
      expect(result).toBe('Bio: &lt;em&gt;Developer&lt;/em&gt;');
    });

    it('should return undefined for missing nested properties', async () => {
      const schema = z.object({
        user: z
          .object({
            name: z.string(),
          })
          .optional(),
      });

      await expect(
        holma({
          template: 'Hello {user.profile.name}!',
          schema,
          data: { user: { name: 'test' } },
        })
      ).rejects.toBeInstanceOf(MissingValueError);
    });
  });

  describe('error handling', () => {
    it('should throw TypeError for non-string template', async () => {
      const schema = z.object({ name: z.string() });

      // @ts-ignore
      await expect(holma(123, schema, { name: 'test' })).rejects.toThrow(
        TypeError
      );
    });

    it('should throw MissingValueError for undefined values', async () => {
      const schema = z.object({ name: z.string().optional() });

      await expect(
        holma({ template: 'Hello {name}!', schema, data: {} })
      ).rejects.toBeInstanceOf(MissingValueError);
    });

    it('should include key in MissingValueError', async () => {
      const schema = z.object({ name: z.string().optional() });

      try {
        await holma({ template: 'Hello {name}!', schema, data: {} });
      } catch (error) {
        expect(error).toBeInstanceOf(MissingValueError);
        expect((error as MissingValueError).key).toBe('name');
      }
    });

    it('should throw SchemaError for validation failures', async () => {
      const schema = z.object({ name: z.string() });

      await expect(
        // @ts-ignore
        holma({ template: 'Hello {name}!', schema, data: { name: 123 } })
      ).rejects.toBeInstanceOf(SchemaError);
    });
  });

  describe('options', () => {
    it('should ignore missing values when ignoreMissing is true', async () => {
      const schema = z.object({ name: z.string().optional() });
      const result = await holma({
        template: 'Hello {name}!',
        schema,
        data: {},
        options: { ignoreMissing: true },
      });
      expect(result).toBe('Hello {name}!');
    });

    it('should apply transform function', async () => {
      const schema = z.object({ name: z.string() });
      const options: HolmaOptions = {
        transform: ({ value }) =>
          typeof value === 'string' ? value.toUpperCase() : value,
      };

      const result = await holma({
        template: 'Hello {name}!',
        schema,
        data: { name: 'world' },
        options,
      });
      expect(result).toBe('Hello WORLD!');
    });

    it('should pass key to transform function', async () => {
      const schema = z.object({
        first: z.string(),
        last: z.string(),
      });
      const options: HolmaOptions = {
        transform: ({ value, key }) => `${key}:${value}`,
      };

      const result = await holma({
        template: 'Hello {first} {last}!',
        schema,
        data: {
          first: 'John',
          last: 'Doe',
        },
        options,
      });
      expect(result).toBe('Hello first:John last:Doe!');
    });

    it('should handle transform returning undefined', async () => {
      const schema = z.object({ name: z.string() });
      const options: HolmaOptions = {
        transform: () => undefined,
      };

      await expect(
        holma({
          template: 'Hello {name}!',
          schema,
          data: { name: 'world' },
          options,
        })
      ).rejects.toBeInstanceOf(MissingValueError);
    });

    it('should ignore missing when transform returns undefined and ignoreMissing is true', async () => {
      const schema = z.object({ name: z.string() });
      const options: HolmaOptions = {
        ignoreMissing: true,
        transform: () => undefined,
      };

      const result = await holma({
        template: 'Hello {name}!',
        schema,
        data: { name: 'world' },
        options,
      });
      expect(result).toBe('Hello {name}!');
    });
  });

  describe('edge cases', () => {
    it('should handle empty template', async () => {
      const schema = z.object({});
      const result = await holma({ template: '', schema, data: {} });
      expect(result).toBe('');
    });

    it('should handle template with no placeholders', async () => {
      const schema = z.object({});
      const result = await holma({
        template: 'No placeholders here',
        schema,
        data: {},
      });
      expect(result).toBe('No placeholders here');
    });

    it('should handle numeric keys', async () => {
      const schema = z.object({
        '0': z.string(),
        '123': z.string(),
      });
      const result = await holma({
        template: '{0} and {123}',
        schema,
        data: {
          '0': 'zero',
          '123': 'one-two-three',
        },
      });
      expect(result).toBe('zero and one-two-three');
    });

    it('should handle special characters in values', async () => {
      const schema = z.object({
        special: z.string(),
      });
      const result = await holma({
        template: 'Value: {special}',
        schema,
        data: {
          special: '{}[]().*+?^$|\\',
        },
      });
      expect(result).toBe('Value: {}[]().*+?^$|\\');
    });

    it('should convert non-string values to strings', async () => {
      const schema = z.object({
        num: z.number(),
        bool: z.boolean(),
        arr: z.array(z.string()),
      });
      const result = await holma({
        template: '{num} {bool} {arr}',
        schema,
        data: {
          num: 42,
          bool: true,
          arr: ['a', 'b', 'c'],
        },
      });
      expect(result).toBe('42 true a,b,c');
    });
  });

  describe('Valibot schema support', () => {
    it('should work with Valibot schemas', async () => {
      const schema = v.object({
        name: v.string(),
        age: v.number(),
      });

      const result = await holma({
        template: 'Hello {name}, age: {age}',
        schema,
        data: {
          name: 'Bob',
          age: 25,
        },
      });
      expect(result).toBe('Hello Bob, age: 25');
    });

    it('should validate with Valibot and throw SchemaError on failure', async () => {
      const schema = v.object({
        name: v.string(),
      });

      await expect(
        // @ts-ignore
        holma({ template: 'Hello {name}!', schema, data: { name: 123 } })
      ).rejects.toBeInstanceOf(SchemaError);
    });

    it('should handle optional fields with Valibot', async () => {
      const schema = v.object({
        name: v.optional(v.string()),
      });

      await expect(
        holma({ template: 'Hello {name}!', schema, data: {} })
      ).rejects.toBeInstanceOf(MissingValueError);
    });

    it('should work with nested Valibot schemas', async () => {
      const schema = v.object({
        user: v.object({
          details: v.object({
            firstName: v.string(),
            lastName: v.string(),
          }),
        }),
      });

      const result = await holma({
        template: 'Hello {user.details.firstName} {user.details.lastName}!',
        schema,
        data: {
          user: {
            details: {
              firstName: 'Jane',
              lastName: 'Smith',
            },
          },
        },
      });
      expect(result).toBe('Hello Jane Smith!');
    });
  });

  describe('complex scenarios', () => {
    it('should handle large templates with munknown placeholders', async () => {
      const schema = z.object({
        title: z.string(),
        author: z.string(),
        date: z.string(),
        content: z.string(),
      });

      const template = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>{{title}}</title>
          </head>
          <body>
            <h1>{{title}}</h1>
            <p>By: {author} on {date}</p>
            <div>{{content}}</div>
          </body>
        </html>
      `;

      const result = await holma({
        template,
        schema,
        data: {
          title: 'My <Blog> Post',
          author: 'John Doe',
          date: '2024-01-01',
          content: '<p>This is <em>content</em> with HTML</p>',
        },
      });

      expect(result).toContain('&lt;Blog&gt;');
      expect(result).toContain('John Doe');
      expect(result).toContain(
        '&lt;p&gt;This is &lt;em&gt;content&lt;/em&gt; with HTML&lt;/p&gt;'
      );
    });

    it('should handle recursive template processing safely', async () => {
      const schema = z.object({
        template: z.string(),
        value: z.string(),
      });

      // Template contains a placeholder that resolves to another template-like string
      const result = await holma({
        template: 'Template: {template}, Value: {value}',
        schema,
        data: {
          template: 'Hello {world}',
          value: 'test',
        },
      });

      // Should not recursively process the resolved template
      expect(result).toBe('Template: Hello {world}, Value: test');
    });

    it('should maintain performance with regex operations', async () => {
      const schema = z.object({
        item: z.string(),
      });

      // Template that would cause regex backtracking issues if not handled properly
      const template = '{item}'.repeat(1000);
      const data = { item: 'x' };

      const start = Date.now();
      const result = await holma({ template, schema, data });
      const duration = Date.now() - start;

      expect(result).toBe('x'.repeat(1000));
      expect(duration).toBeLessThan(1000); // Should complete quickly
    });
  });
});
