import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export const prerender = true;

export async function GET(context: APIContext) {
	const posts = await getCollection('posts', ({ data }) => !data.draft);
	const sorted = posts.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

	return rss({
		title: 'sybilsedge — Blog',
		description: 'Cloud architecture, Terraform, networking, AI, and whatever else surfaces after banging on a problem long enough to have something worth writing down.',
		site: context.site!,
		items: sorted.map((entry) => ({
			title: entry.data.title,
			description: entry.data.description,
			pubDate: entry.data.date,
			link: `/blog/${entry.id}/`,
		})),
	});
}
