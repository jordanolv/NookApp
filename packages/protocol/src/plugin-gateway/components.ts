import { z } from 'zod';

const textVariant = z.enum(['body', 'heading', 'subheading', 'muted', 'caption']);
const buttonStyle = z.enum(['primary', 'secondary', 'danger', 'ghost']);
const inputType = z.enum(['text', 'number', 'textarea', 'password', 'email']);

const textComponentSchema = z.object({
  type: z.literal('text'),
  content: z.string(),
  variant: textVariant.optional(),
});

const imageComponentSchema = z.object({
  type: z.literal('image'),
  url: z.string().url(),
  alt: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

const dividerComponentSchema = z.object({
  type: z.literal('divider'),
});

const linkComponentSchema = z.object({
  type: z.literal('link'),
  label: z.string(),
  url: z.string().url(),
});

const buttonComponentSchema = z.object({
  type: z.literal('button'),
  label: z.string(),
  actionId: z.string(),
  style: buttonStyle.optional(),
  disabled: z.boolean().optional(),
});

const inputComponentSchema = z.object({
  type: z.literal('input'),
  id: z.string(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
  inputType: inputType.optional(),
  required: z.boolean().optional(),
});

const selectOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
});

const selectComponentSchema = z.object({
  type: z.literal('select'),
  id: z.string(),
  label: z.string().optional(),
  placeholder: z.string().optional(),
  options: z.array(selectOptionSchema),
  defaultValue: z.string().optional(),
  required: z.boolean().optional(),
});

type LeafComponent =
  | z.infer<typeof textComponentSchema>
  | z.infer<typeof imageComponentSchema>
  | z.infer<typeof dividerComponentSchema>
  | z.infer<typeof linkComponentSchema>
  | z.infer<typeof buttonComponentSchema>
  | z.infer<typeof inputComponentSchema>
  | z.infer<typeof selectComponentSchema>;

export type Component =
  | LeafComponent
  | {
      type: 'container';
      direction?: 'row' | 'col';
      gap?: number;
      align?: 'start' | 'center' | 'end';
      children: Component[];
    }
  | { type: 'card'; title?: string; children: Component[] }
  | { type: 'list'; children: Component[] };

// Recursive containers use z.lazy so children can reference the union itself.
export const componentSchema: z.ZodType<Component> = z.lazy(() =>
  z.union([
    textComponentSchema,
    imageComponentSchema,
    dividerComponentSchema,
    linkComponentSchema,
    buttonComponentSchema,
    inputComponentSchema,
    selectComponentSchema,
    z.object({
      type: z.literal('container'),
      direction: z.enum(['row', 'col']).optional(),
      gap: z.number().int().nonnegative().optional(),
      align: z.enum(['start', 'center', 'end']).optional(),
      children: z.array(componentSchema),
    }),
    z.object({
      type: z.literal('card'),
      title: z.string().optional(),
      children: z.array(componentSchema),
    }),
    z.object({
      type: z.literal('list'),
      children: z.array(componentSchema),
    }),
  ]),
);

export type ComponentTree = Component[];
export const componentTreeSchema = z.array(componentSchema);
