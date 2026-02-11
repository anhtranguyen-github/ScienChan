# Frontend Runtime Validation with Zod

## Rationale
To ensure type safety at the boundaries of our application, we use **runtime validation** for all data coming from the backend API. TypeScript types are erased at runtime; Zod schemas enforce the contract.

## Principles

### 1. Schema Definition
Define schemas in `src/lib/schemas/` mirroring backend Pydantic models.

```typescript
// src/lib/schemas/workspaces.ts
import { z } from 'zod';

export const WorkspaceSchema = z.object({
  id: z.string().length(8),
  name: z.string().min(1),
  // ... other fields matching backend
});
```

### 2. API Response Wrapping
Backend responses are standardized with `AppResponse` wrapper, so our validation must account for `success`, `code`, `message`, and `data`.

```typescript
// src/lib/schemas/api.ts
export const AppResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    code: z.string().optional(),
    message: z.string().optional(),
    data: dataSchema.optional(), // Type-safe data extraction
  });
```

### 3. Hook Integration (`safeParse`)
Use `zod.safeParse()` inside data fetching hooks (`useWorkspaces`, `useDocuments`).

```typescript
const { AppResponseSchema } = ...;
const schema = AppResponseSchema(z.array(WorkspaceSchema));

const result = schema.safeParse(backendJson);
if (!result.success) {
  console.error("API Contract Violation:", result.error);
  showError("System Error", "Backend returned invalid data structure.");
  return; 
}
// result.data is now fully typed and runtime-validated!
```

### 4. Form Validation (`react-hook-form`)
Use `@hookform/resolvers/zod` for immediate client-side feedback.

```typescript
const form = useForm({
  resolver: zodResolver(CreateWorkspaceSchema),
  defaultValues: { name: '' }
});
```
This ensures invalid data never even reaches the `fetch` call, saving network requests.

## Benefits
- **Fail Fast**: Detect contract breaches immediately instead of obscure `undefined is not an object` crashes deep in UI components.
- **Graceful Degradation**: Handle schema drift (e.g., field rename) with user-friendly error messages.
- **Documentation**: Schemas serve as live documentation of expected data shapes.

## Migration Guide
When adding a new API endpoint:
1.  Define Zod schema for response body.
2.  Update hook to validate response `json()` against schema.
3.  Add error handling for `!result.success`.
