<p align="center">
  <h1 align="center">🏝️<br/><code>holma</code></h1>
  <p align="center">Simple micro templating with Standard Schema validation and HTML escaping.</p>
</p>
<br/>
<p align="center">
<a href="https://opensource.org/licenses/MIT" rel="nofollow"><img src="https://img.shields.io/github/license/johnie/holma" alt="License"></a>
<a href="https://www.npmjs.com/package/holma" rel="nofollow"><img src="https://img.shields.io/npm/v/holma.svg" alt="npm"></a>
<a href="https://github.com/johnie/holma/actions"><img src="https://github.com/johnie/holma/actions/workflows/ci.yml/badge.svg" alt="Build Status"></a>
<a href="https://github.com/johnie/holma" rel="nofollow"><img src="https://img.shields.io/github/stars/johnie/holma" alt="stars"></a>
</p>
<br/>
<br/>

## Installation

Install holma with your preferred package manager:

```bash
npm install holma
# or
pnpm add holma
# or
bun add holma
```

For schema validation, install a compatible validation library:

```bash
npm install zod valibot effect
# or your preferred validation library that supports Standard Schema
```

## Quick Start

```typescript
import { holma } from "holma";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  message: z.string(),
});

const template = "Hello {name}! Your message: {{message}}";
const data = {
  name: "World",
  message: '<script>alert("xss")</script>',
};

const result = await holma({
  template,
  schema,
  data,
});
console.log(result);
// Output: Hello World! Your message: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

## Features

- **Simple templating** - Use `{key}` for raw values and `{{key}}` for HTML-escaped values
- **Nested access** - Support for dot notation like `{user.profile.name}`
- **Schema validation** - Validate and transform data with any [Standard Schema](https://standardschema.dev/) compatible library
- **HTML escaping** - Automatic HTML escaping for double braces to prevent XSS
- **Transform functions** - Custom value transformation before template replacement
- **Missing value handling** - Configurable behavior for undefined values
- **TypeScript support** - Full type definitions with schema inference
- **Zero runtime dependencies** - Lightweight core with optional validation libraries

## API Reference

### `holma` Function

The main function for template rendering with validation.

```typescript
import { holma } from "holma";

const result = await holma({
  template,
  schema,
  data,
  options,
});
```

#### Function Signature

```typescript
async function holma<T extends StandardSchemaV1>({
  template,
  schema,
  data,
  options = {},
}: {
  template: string;
  schema: T;
  data: StandardSchemaV1.InferInput<T>;
  options?: HolmaOptions;
}): Promise<string>;
```

#### Parameters

- **`template`** - Template string with `{key}` and `{{key}}` placeholders
- **`schema`** - Standard Schema compatible validation schema
- **`data`** - Input data to validate and use for template replacement
- **`options`** - Optional configuration object

#### Options

```typescript
interface HolmaOptions {
  ignoreMissing?: boolean; // Default: false
  transform?: (args: { value: unknown; key: string }) => unknown;
}
```

- **`ignoreMissing`** - When `true`, undefined values leave placeholders unchanged. When `false`, throws `MissingValueError`
- **`transform`** - Function to transform values before template replacement

## Template Syntax

### Single Braces - Raw Values

Use `{key}` for raw value replacement without HTML escaping:

```typescript
const result = await holma({
  template: "Hello {name}!",
  schema,
  data: { name: "World" },
});
// Output: Hello World!
```

### Double Braces - HTML Escaped Values

Use `{{key}}` for HTML-escaped values to prevent XSS:

```typescript
const result = await holma({
  template: "Content: {{html}}",
  schema,
  data: { html: '<script>alert("xss")</script>' },
});
// Output: Content: &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;
```

### Nested Object Access

Use dot notation to access nested object properties:

```typescript
const schema = z.object({
  user: z.object({
    profile: z.object({
      name: z.string(),
    }),
  }),
});

const result = await holma({
  template: "Hello {user.profile.name}!",
  schema,
  data: {
    user: {
      profile: {
        name: "Alice",
      },
    },
  },
});
// Output: Hello Alice!
```

### Mixed Syntax

Combine raw and escaped values in the same template:

```typescript
const result = await holma({
  template: "Hello {name}, your bio: {{bio}}",
  schema,
  data: {
    name: "John",
    bio: "<strong>Developer</strong>",
  },
});
// Output: Hello John, your bio: &lt;strong&gt;Developer&lt;/strong&gt;
```

## Schema Validation

Holma supports any validation library that implements the [Standard Schema](https://standardschema.dev/) specification, including Zod, Valibot, and Effect Schema.

### With Zod

```typescript
import { z } from "zod";
import { holma } from "holma";

const UserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0),
  isActive: z.boolean(),
});

const template = `
  <div class="user-card">
    <h2>{{name}}</h2>
    <p>Email: {{email}}</p>
    <p>Age: {age}</p>
    <p>Status: {isActive}</p>
  </div>
`;

const userData = {
  name: "John Doe",
  email: "john@example.com",
  age: 30,
  isActive: true,
};

const result = await holma({
  template,
  schema: UserSchema,
  data: userData,
});
console.log(result);
// Output: Fully validated and rendered HTML with proper escaping
```

### With Valibot

```typescript
import * as v from "valibot";
import { holma } from "holma";

const ProductSchema = v.object({
  title: v.string(),
  price: v.number(),
  description: v.string(),
  tags: v.array(v.string()),
});

const template = `
  <article>
    <h1>{{title}}</h1>
    <p class="price">${price}</p>
    <p>{{description}}</p>
    <div class="tags">{tags}</div>
  </article>
`;

const result = await holma({
  template,
  schema: ProductSchema,
  data: {
    title: "Amazing Product",
    price: 29.99,
    description: "This product has <em>amazing</em> features!",
    tags: ["new", "featured", "sale"],
  },
});
```

### Custom Schema

Create custom schemas that implement the Standard Schema interface:

```typescript
import type { StandardSchemaV1 } from "@standard-schema/spec";

interface BlogPost {
  title: string;
  content: string;
  publishedAt: Date;
}

const BlogPostSchema: StandardSchemaV1<Record<string, unknown>, BlogPost> = {
  "~standard": {
    version: 1,
    vendor: "custom-blog-validator",
    validate: (value) => {
      const obj = value as Record<string, unknown>;

      if (!obj.title || typeof obj.title !== "string") {
        return {
          issues: [
            {
              message: "title is required and must be a string",
              path: ["title"],
            },
          ],
        };
      }

      if (!obj.content || typeof obj.content !== "string") {
        return {
          issues: [
            {
              message: "content is required and must be a string",
              path: ["content"],
            },
          ],
        };
      }

      const publishedAt = new Date(obj.publishedAt as string);
      if (isNaN(publishedAt.getTime())) {
        return {
          issues: [
            {
              message: "publishedAt must be a valid date",
              path: ["publishedAt"],
            },
          ],
        };
      }

      return {
        value: {
          title: obj.title,
          content: obj.content,
          publishedAt,
        },
      };
    },
  },
};

const result = await holma({
  template: blogTemplate,
  schema: BlogPostSchema,
  data: rawData,
});
```

## Options

### `ignoreMissing` Option

Control how undefined values are handled:

```typescript
// Default behavior - throws MissingValueError
try {
  await holma({
    template: "Hello {name}!",
    schema,
    data: {},
  });
} catch (error) {
  console.log(error instanceof MissingValueError); // true
}

// Ignore missing values - leaves placeholder unchanged
const result = await holma({
  template: "Hello {name}!",
  schema,
  data: {},
  options: { ignoreMissing: true },
});
console.log(result); // "Hello {name}!"
```

### `transform` Option

Apply custom transformations to values before template replacement:

```typescript
const options = {
  transform: ({ value, key }) => {
    if (typeof value === "string") {
      return value.toUpperCase();
    }
    if (key === "price") {
      return `$${value}`;
    }
    return value;
  },
};

const result = await holma({
  template: "Product: {name}, Price: {price}",
  schema,
  data: { name: "widget", price: 29.99 },
  options,
});
// Output: Product: WIDGET, Price: $29.99
```

### Transform with Key Context

Use the key parameter to apply different transformations based on the placeholder:

```typescript
const options = {
  transform: ({ value, key }) => {
    switch (key) {
      case "timestamp":
        return new Date(value as string).toLocaleString();
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value as number);
      case "username":
        return `@${value}`;
      default:
        return value;
    }
  },
};

const result = await holma({
  template: "User {username} paid {currency} at {timestamp}",
  schema,
  data: {
    username: "johndoe",
    currency: 99.5,
    timestamp: "2024-01-15T10:30:00Z",
  },
  options,
});
// Output: User @johndoe paid $99.50 at 1/15/2024, 10:30:00 AM
```

## Error Handling

Holma provides detailed error information for both validation and template processing errors.

### MissingValueError

Thrown when a placeholder value is undefined and `ignoreMissing` is false:

```typescript
import { MissingValueError } from "holma";

try {
  await holma({
    template: "Hello {name}!",
    schema,
    data: {},
  });
} catch (error) {
  if (error instanceof MissingValueError) {
    console.log(error.message); // "Missing a value for the placeholder: name"
    console.log(error.key); // "name"
  }
}
```

### Schema Validation Errors

Schema validation errors are thrown as `SchemaError` from the Standard Schema utils:

```typescript
import { z } from "zod";
import { SchemaError } from "@standard-schema/utils";

const schema = z.object({
  age: z.number().min(18),
});

try {
  await holma({
    template: "Age: {age}",
    schema,
    data: { age: 16 },
  });
} catch (error) {
  if (error instanceof SchemaError) {
    console.log("Validation failed:", error.issues);
  }
}
```

## Examples

### Basic HTML Template

```typescript
import { z } from "zod";
import { holma } from "holma";

const PageSchema = z.object({
  title: z.string(),
  heading: z.string(),
  content: z.string(),
  author: z.string(),
});

const htmlTemplate = `
<!DOCTYPE html>
<html>
  <head>
    <title>{{title}}</title>
  </head>
  <body>
    <h1>{{heading}}</h1>
    <div class="content">{{content}}</div>
    <footer>By: {author}</footer>
  </body>
</html>
`;

const pageData = {
  title: "My Blog & Journal",
  heading: "Welcome to <strong>My Blog</strong>",
  content: "<p>This is my first post with <em>emphasis</em>!</p>",
  author: "John Doe",
};

const result = await holma({
  template: htmlTemplate,
  schema: PageSchema,
  data: pageData,
});
// Produces safe HTML with proper escaping for title, heading, and content
// but raw output for author name
```

### Email Template with Nested Data

```typescript
import { z } from "zod";
import { holma } from "holma";

const EmailSchema = z.object({
  user: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
  }),
  order: z.object({
    id: z.string(),
    total: z.number(),
    items: z.array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        price: z.number(),
      })
    ),
  }),
  company: z.object({
    name: z.string(),
    supportEmail: z.string().email(),
  }),
});

const emailTemplate = `
Dear {user.firstName} {user.lastName},

Thank you for your order #{order.id}!

Order Details:
- Total: ${order.total}
- Items: {order.items}

If you have any questions, please contact us at {company.supportEmail}.

Best regards,
The {{company.name}} Team
`;

const emailData = {
  user: {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane@example.com",
  },
  order: {
    id: "ORD-12345",
    total: 89.99,
    items: [
      { name: "Widget", quantity: 2, price: 29.99 },
      { name: "Gadget", quantity: 1, price: 30.01 },
    ],
  },
  company: {
    name: "ACME Corp & Co.",
    supportEmail: "support@acme.com",
  },
};

const result = await holma({
  template: emailTemplate,
  schema: EmailSchema,
  data: emailData,
});
```

### Configuration Template with Transformations

```typescript
import { z } from "zod";
import { holma } from "holma";

const ConfigSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number(),
    name: z.string(),
    ssl: z.boolean(),
  }),
  redis: z.object({
    url: z.string(),
    maxConnections: z.number(),
  }),
  app: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.enum(["development", "staging", "production"]),
  }),
});

const configTemplate = `
# Application Configuration
APP_NAME={app.name}
APP_VERSION={app.version}
ENVIRONMENT={app.environment}

# Database Configuration  
DB_HOST={database.host}
DB_PORT={database.port}
DB_NAME={database.name}
DB_SSL={database.ssl}

# Redis Configuration
REDIS_URL={{redis.url}}
REDIS_MAX_CONNECTIONS={redis.maxConnections}

# Generated at: {timestamp}
`;

const options = {
  transform: ({ value, key }) => {
    if (key === "timestamp") {
      return new Date().toISOString();
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    return value;
  },
};

const configData = {
  database: {
    host: "localhost",
    port: 5432,
    name: "myapp_db",
    ssl: true,
  },
  redis: {
    url: "redis://localhost:6379",
    maxConnections: 100,
  },
  app: {
    name: "MyApp",
    version: "1.0.0",
    environment: "production" as const,
  },
  timestamp: null, // Will be transformed to current timestamp
};

const result = await holma({
  template: configTemplate,
  schema: ConfigSchema,
  data: configData,
  options,
});
```

### Markdown Template with Code Blocks

```typescript
import { z } from "zod";
import { holma } from "holma";

const DocumentationSchema = z.object({
  title: z.string(),
  description: z.string(),
  apiEndpoint: z.string(),
  exampleCode: z.string(),
  parameters: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      required: z.boolean(),
      description: z.string(),
    })
  ),
});

const markdownTemplate = `
# {{title}}

{{description}}

## API Endpoint

\`{apiEndpoint}\`

## Parameters

{parameters}

## Example Usage

\`\`\`javascript
{exampleCode}
\`\`\`

---
*Generated documentation for {{title}}*
`;

const options = {
  transform: ({ value, key }) => {
    if (key === "parameters") {
      const params = value as Array<{
        name: string;
        type: string;
        required: boolean;
        description: string;
      }>;
      return params
        .map(
          (p) =>
            `- **${p.name}** (${p.type})${p.required ? " *required*" : ""}: ${
              p.description
            }`
        )
        .join("\n");
    }
    return value;
  },
};

const docData = {
  title: "User API Documentation",
  description: "Complete reference for the User management API endpoints.",
  apiEndpoint: "/api/v1/users",
  exampleCode: `const response = await fetch('/api/v1/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'John Doe', email: 'john@example.com' })
});`,
  parameters: [
    {
      name: "name",
      type: "string",
      required: true,
      description: "User full name",
    },
    {
      name: "email",
      type: "string",
      required: true,
      description: "User email address",
    },
    { name: "age", type: "number", required: false, description: "User age" },
  ],
};

const result = await holma({
  template: markdownTemplate,
  schema: DocumentationSchema,
  data: docData,
  options,
});
```

### Complex Nested Template

```typescript
import { z } from "zod";
import { holma } from "holma";

const BlogPostSchema = z.object({
  post: z.object({
    title: z.string(),
    slug: z.string(),
    content: z.string(),
    publishedAt: z.string(),
    author: z.object({
      name: z.string(),
      bio: z.string(),
      avatar: z.string().url(),
      social: z.object({
        twitter: z.string().optional(),
        github: z.string().optional(),
      }),
    }),
    tags: z.array(z.string()),
    comments: z.array(
      z.object({
        author: z.string(),
        content: z.string(),
        createdAt: z.string(),
      })
    ),
  }),
  site: z.object({
    name: z.string(),
    baseUrl: z.string().url(),
  }),
});

const blogTemplate = `
<!DOCTYPE html>
<html>
<head>
  <title>{{post.title}} | {{site.name}}</title>
  <meta property="og:title" content="{{post.title}}" />
  <meta property="og:url" content="{site.baseUrl}/posts/{post.slug}" />
</head>
<body>
  <article>
    <header>
      <h1>{{post.title}}</h1>
      <time datetime="{post.publishedAt}">{post.publishedAt}</time>
      <div class="tags">{post.tags}</div>
    </header>
    
    <div class="content">
      {{post.content}}
    </div>
    
    <footer>
      <div class="author">
        <img src="{{post.author.avatar}}" alt="{post.author.name}" />
        <div>
          <h3>{post.author.name}</h3>
          <p>{{post.author.bio}}</p>
          <div class="social">
            <span>Follow: {post.author.social.twitter} {post.author.social.github}</span>
          </div>
        </div>
      </div>
    </footer>
    
    <section class="comments">
      <h2>Comments</h2>
      {post.comments}
    </section>
  </article>
</body>
</html>
`;

const options = {
  transform: ({ value, key }) => {
    if (key === "post.tags") {
      const tags = value as string[];
      return tags.map((tag) => `<span class="tag">${tag}</span>`).join(" ");
    }

    if (key === "post.publishedAt") {
      return new Date(value as string).toLocaleDateString();
    }

    if (key === "post.author.social.twitter" && value) {
      return `<a href="https://twitter.com/${value}">@${value}</a>`;
    }

    if (key === "post.author.social.github" && value) {
      return `<a href="https://github.com/${value}">GitHub</a>`;
    }

    if (key === "post.comments") {
      const comments = value as Array<{
        author: string;
        content: string;
        createdAt: string;
      }>;
      return comments
        .map(
          (comment) => `
        <div class="comment">
          <strong>${comment.author}</strong>
          <time>${new Date(comment.createdAt).toLocaleDateString()}</time>
          <p>${comment.content}</p>
        </div>
      `
        )
        .join("");
    }

    return value;
  },
};

const blogData = {
  post: {
    title: "Building Modern Web Applications",
    slug: "building-modern-web-apps",
    content:
      "<p>In this post, we'll explore <strong>modern</strong> techniques...</p>",
    publishedAt: "2024-01-15T10:00:00Z",
    author: {
      name: "Jane Developer",
      bio: "Full-stack developer with 10+ years of experience in <em>modern</em> web technologies.",
      avatar: "https://example.com/avatar.jpg",
      social: {
        twitter: "janedev",
        github: "jane-developer",
      },
    },
    tags: ["javascript", "typescript", "web-development"],
    comments: [
      {
        author: "John Reader",
        content: "Great article! Thanks for sharing.",
        createdAt: "2024-01-15T12:00:00Z",
      },
    ],
  },
  site: {
    name: "TechBlog",
    baseUrl: "https://techblog.example.com",
  },
};

const result = await holma({
  template: blogTemplate,
  schema: BlogPostSchema,
  data: blogData,
  options,
});
```

## TypeScript Integration

Holma provides excellent TypeScript support with full type inference when using schemas:

```typescript
import { z } from "zod";
import { holma } from "holma";

const UserSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  isActive: z.boolean(),
  metadata: z.object({
    lastLogin: z.string(),
    preferences: z.object({
      theme: z.enum(["light", "dark"]),
      notifications: z.boolean(),
    }),
  }),
});

// TypeScript automatically infers the input type
type UserInput = z.input<typeof UserSchema>; // Raw input type
type UserOutput = z.output<typeof UserSchema>; // Validated output type

const renderUserProfile = async (userData: UserInput): Promise<string> => {
  const template = `
    <div class="user-profile">
      <h2>{{name}}</h2>
      <p>Email: {{email}}</p>
      <p>Status: {isActive}</p>
      <p>Theme: {metadata.preferences.theme}</p>
      <p>Last login: {metadata.lastLogin}</p>
    </div>
  `;

  // Full type safety with schema validation
  return await holma({
    template,
    schema: UserSchema,
    data: userData,
  });
};

// TypeScript will catch type errors at compile time
const result = await renderUserProfile({
  id: 123,
  name: "John Doe",
  email: "john@example.com",
  isActive: true,
  metadata: {
    lastLogin: "2024-01-15T10:30:00Z",
    preferences: {
      theme: "dark",
      notifications: true,
    },
  },
});
```

### Generic Templates

Create reusable template functions with TypeScript generics:

```typescript
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { holma, type HolmaOptions } from "holma";

async function renderTemplate<T extends StandardSchemaV1>({
  template,
  schema,
  data,
  options,
}: {
  template: string;
  schema: T;
  data: StandardSchemaV1.InferInput<T>;
  options?: HolmaOptions;
}): Promise<string> {
  return await holma({ template, schema, data, options });
}

// Usage with different schemas
const userResult = await renderTemplate({
  template: userTemplate,
  schema: UserSchema,
  data: userData,
});
const productResult = await renderTemplate({
  template: productTemplate,
  schema: ProductSchema,
  data: productData,
});
```

## Performance

Holma is designed to be fast and lightweight:

- **Minimal dependencies** - Only essential dependencies for core functionality
- **Efficient regex operations** - Optimized patterns that avoid backtracking
- **Single-pass processing** - Templates are processed in one pass for maximum efficiency
- **Schema validation caching** - Validation results are processed once per template render

### Performance Tips

```typescript
// For performance-critical applications, pre-compile templates
const compiledTemplate = "{{title}} - {description}";

// Use simpler schemas when possible
const SimpleSchema = z.object({
  title: z.string(),
  description: z.string(),
});

// For high-volume rendering, consider caching validation results
const cachedSchema = SimpleSchema; // Reuse schema instances

// Batch processing
const templates = await Promise.all([
  holma({ template: template1, schema, data: data1 }),
  holma({ template: template2, schema, data: data2 }),
  holma({ template: template3, schema, data: data3 }),
]);
```

### Benchmarking

```typescript
// Example performance test
const template = "User: {name}, Email: {{email}}, Status: {active}".repeat(100);
const schema = z.object({
  name: z.string(),
  email: z.string(),
  active: z.boolean(),
});

const data = {
  name: "John Doe",
  email: "john@example.com",
  active: true,
};

console.time("holma-render");
for (let i = 0; i < 1000; i++) {
  await holma({ template, schema, data });
}
console.timeEnd("holma-render");
```

## Security

Holma includes built-in security features to prevent common web vulnerabilities:

### XSS Prevention

Double braces automatically HTML-escape values:

```typescript
const dangerousData = {
  userInput: '<script>alert("XSS")</script>',
  safeContent: "Regular content",
};

const result = await holma({
  template: "User input: {{userInput}}, Safe: {safeContent}",
  schema,
  data: dangerousData,
});
// Output: User input: &lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;, Safe: Regular content
```

### Safe Nested Access

Nested property access is safe and won't throw errors:

```typescript
const partialData = {
  user: {
    name: "John",
    // profile is missing
  },
};

// This won't crash, but will throw MissingValueError
try {
  await holma({
    template: "Profile: {user.profile.bio}",
    schema,
    data: partialData,
  });
} catch (error) {
  // Handle missing data gracefully
}

// Or ignore missing values
const result = await holma({
  template: "Profile: {user.profile.bio}",
  schema,
  data: partialData,
  options: { ignoreMissing: true },
});
// Output: Profile: {user.profile.bio}
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/johnie/holma/blob/main/CONTRIBUTING.md) for details.

## License

MIT License. See the [LICENSE](https://github.com/johnie/holma/blob/main/LICENSE) file for details.
