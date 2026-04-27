import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export const prerender = true;

export async function GET(context: APIContext) {
	const recipes = await getCollection('recipes');
	const sorted = recipes.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

	return rss({
		title: 'sybilsedge — Kitchen',
		description: 'Recipes for baking, cooking, and preservation — from scratch and from the heart.',
		site: context.site!,
		items: sorted.map((entry) => ({
			title: entry.data.title,
			description: entry.data.description,
			pubDate: entry.data.date,
			link: `/kitchen/${entry.id}/`,
		})),
	});
}
