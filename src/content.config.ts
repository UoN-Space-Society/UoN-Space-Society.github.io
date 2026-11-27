import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      category: z.string().min(1),
      description: z.string().min(1),
      image: image(),
      imageAlt: z.string().min(1),
      badge: z.boolean().default(false),
      group: z.enum(['recent', 'upcoming', 'archive']),
      order: z.number().int().nonnegative(),
      url: z.url(),
      linkLabel: z.string().min(1),
      featured: z
        .object({
          title: z.string(),
          category: z.string(),
          tagline: z.string(),
        })
        .optional(),
    }),
});

export const collections = { projects };
