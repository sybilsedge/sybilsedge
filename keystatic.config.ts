import { config, fields, collection } from '@keystatic/core';

	const isProd = import.meta.env.PROD;

	storage: isProd
		? {
				kind: 'github',
				repo: 'sybilsedge/sybilsedge',
			}
		: {
				kind: 'local',
			},
	collections: {
		universes: collection({
			label: 'Universes',
			slugField: 'name',
			path: 'src/content/universes/*',
			format: { contentField: 'content' },
			schema: {
				name: fields.slug({ name: { label: 'Name' } }),
				tagline: fields.text({ label: 'Tagline' }),
				description: fields.text({ label: 'Description', multiline: true }),
				coverImage: fields.object({
					src: fields.image({
						label: 'Cover Image',
						directory: 'src/assets/images/universes',
						publicPath: '../../assets/images/universes/',
					}),
					alt: fields.text({ label: 'Alt Text' }),
				}),
				status: fields.select({
					label: 'Status',
					options: [
						{ label: 'Active', value: 'active' },
						{ label: 'Planned', value: 'planned' },
						{ label: 'Archived', value: 'archived' },
					],
					defaultValue: 'active',
				}),
				content: fields.markdoc({ label: 'Content' }),
			},
		}),
		characters: collection({
			label: 'Characters',
			slugField: 'name',
			path: 'src/content/characters/*',
			format: { contentField: 'content' },
			schema: {
				name: fields.slug({ name: { label: 'Name' } }),
				aliases: fields.array(fields.text({ label: 'Alias' }), {
					label: 'Aliases',
					itemLabel: (props) => props.value,
				}),
				universe: fields.relationship({
					label: 'Universe',
					collection: 'universes',
				}),
				role: fields.text({ label: 'Role' }),
				description: fields.text({ label: 'Description', multiline: true }),
				affiliation: fields.array(fields.text({ label: 'Affiliation' }), {
					label: 'Affiliation',
					itemLabel: (props) => props.value,
				}),
				highlight: fields.text({ label: 'Highlight' }),
				profileImage: fields.object({
					src: fields.image({
						label: 'Profile Image',
						directory: 'src/assets/images/characters',
						publicPath: '../../assets/images/characters/',
					}),
					alt: fields.text({ label: 'Alt Text' }),
				}),
				spoilerLevel: fields.select({
					label: 'Spoiler Level',
					options: [
						{ label: 'None', value: 'none' },
						{ label: 'Light', value: 'light' },
						{ label: 'Moderate', value: 'moderate' },
						{ label: 'Major', value: 'major' },
					],
					defaultValue: 'none',
				}),
				order: fields.number({ label: 'Order' }),
				relatedCharacters: fields.array(
					fields.relationship({
						label: 'Related Character',
						collection: 'characters',
					}),
					{
						label: 'Related Characters',
						itemLabel: (props) => props.value || '',
					}
				),
				content: fields.markdoc({ label: 'Content' }),
			},
		}),
		novels: collection({
			label: 'Novels',
			slugField: 'title',
			path: 'src/content/novels/*',
			format: { contentField: 'content' },
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				universe: fields.relationship({
					label: 'Universe',
					collection: 'universes',
				}),
				status: fields.select({
					label: 'Status',
					options: [
						{ label: 'Draft', value: 'draft' },
						{ label: 'In Progress', value: 'in-progress' },
						{ label: 'Complete', value: 'complete' },
						{ label: 'Published', value: 'published' },
					],
					defaultValue: 'draft',
				}),
				synopsis: fields.text({ label: 'Synopsis', multiline: true }),
				coverImage: fields.object({
					src: fields.image({
						label: 'Cover Image',
						directory: 'src/assets/images/novels',
						publicPath: '../../assets/images/novels/',
					}),
					alt: fields.text({ label: 'Alt Text' }),
				}),
				readingOrder: fields.number({ label: 'Reading Order' }),
				relatedCharacters: fields.array(
					fields.relationship({
						label: 'Related Character',
						collection: 'characters',
					}),
					{
						label: 'Related Characters',
						itemLabel: (props) => props.value || '',
					}
				),
				content: fields.markdoc({ label: 'Content' }),
			},
		}),
		shortStories: collection({
			label: 'Short Stories',
			slugField: 'title',
			path: 'src/content/shortStories/*',
			format: { contentField: 'content' },
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				universe: fields.relationship({
					label: 'Universe',
					collection: 'universes',
				}),
				synopsis: fields.text({ label: 'Synopsis', multiline: true }),
				wordcount: fields.number({ label: 'Word Count' }),
				readingOrder: fields.number({ label: 'Reading Order' }),
				relatedCharacters: fields.array(
					fields.relationship({
						label: 'Related Character',
						collection: 'characters',
					}),
					{
						label: 'Related Characters',
						itemLabel: (props) => props.value || '',
					}
				),
				relatedStories: fields.array(
					fields.relationship({
						label: 'Related Story',
						collection: 'shortStories',
					}),
					{
						label: 'Related Stories',
						itemLabel: (props) => props.value || '',
					}
				),
				tags: fields.array(fields.text({ label: 'Tag' }), {
					label: 'Tags',
					itemLabel: (props) => props.value,
				}),
				content: fields.markdoc({ label: 'Content' }),
			},
		}),
		lore: collection({
			label: 'Lore',
			slugField: 'title',
			path: 'src/content/lore/*',
			format: { contentField: 'content' },
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				universe: fields.relationship({
					label: 'Universe',
					collection: 'universes',
				}),
				category: fields.select({
					label: 'Category',
					options: [
						{ label: 'Location', value: 'location' },
						{ label: 'Faction', value: 'faction' },
						{ label: 'Technology', value: 'technology' },
						{ label: 'History', value: 'history' },
						{ label: 'Culture', value: 'culture' },
						{ label: 'Other', value: 'other' },
					],
					defaultValue: 'other',
				}),
				description: fields.text({ label: 'Description', multiline: true }),
				relatedCharacters: fields.array(
					fields.relationship({
						label: 'Related Character',
						collection: 'characters',
					}),
					{
						label: 'Related Characters',
						itemLabel: (props) => props.value || '',
					}
				),
				relatedStories: fields.array(
					fields.relationship({
						label: 'Related Story',
						collection: 'shortStories',
					}),
					{
						label: 'Related Stories',
						itemLabel: (props) => props.value || '',
					}
				),
				coverImage: fields.object({
					src: fields.image({
						label: 'Cover Image',
						directory: 'src/assets/images/lore',
						publicPath: '../../assets/images/lore/',
					}),
					alt: fields.text({ label: 'Alt Text' }),
				}),
				content: fields.markdoc({ label: 'Content' }),
			},
		}),
		timeline: collection({
			label: 'Timeline Events',
			slugField: 'title',
			path: 'src/content/timeline/*',
			format: { contentField: 'content' },
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				universe: fields.relationship({
					label: 'Universe',
					collection: 'universes',
				}),
				era: fields.text({ label: 'Era' }),
				inUniverseDate: fields.text({ label: 'In-Universe Date' }),
				summary: fields.text({ label: 'Summary', multiline: true }),
				relatedCharacters: fields.array(
					fields.relationship({
						label: 'Related Character',
						collection: 'characters',
					}),
					{
						label: 'Related Characters',
						itemLabel: (props) => props.value || '',
					}
				),
				relatedStories: fields.array(
					fields.relationship({
						label: 'Related Story',
						collection: 'shortStories',
					}),
					{
						label: 'Related Stories',
						itemLabel: (props) => props.value || '',
					}
				),
				relatedLore: fields.array(
					fields.relationship({
						label: 'Related Lore',
						collection: 'lore',
					}),
					{
						label: 'Related Lore',
						itemLabel: (props) => props.value || '',
					}
				),
				content: fields.markdoc({ label: 'Content' }),
			},
		}),
		projects: collection({
			label: 'Projects',
			slugField: 'title',
			path: 'src/content/projects/*',
			format: { contentField: 'content' },
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				category: fields.select({
					label: 'Category',
					options: [
						{ label: 'Tech', value: 'tech' },
						{ label: 'Home', value: 'home' },
						{ label: 'Garden', value: 'garden' },
					],
					defaultValue: 'tech',
				}),
				status: fields.select({
					label: 'Status',
					options: [
						{ label: 'Active', value: 'active' },
						{ label: 'Complete', value: 'complete' },
						{ label: 'Archived', value: 'archived' },
						{ label: 'WIP', value: 'wip' },
					],
					defaultValue: 'wip',
				}),
				description: fields.text({ label: 'Description', multiline: true }),
				githubUrl: fields.text({ label: 'GitHub URL' }),
				image: fields.object({
					src: fields.image({
						label: 'Primary Image',
						directory: 'src/assets/images/projects',
						publicPath: '../../assets/images/projects/',
					}),
					alt: fields.text({ label: 'Alt Text' }),
				}),
				images: fields.array(
					fields.object({
						src: fields.image({
							label: 'Gallery Image',
							directory: 'src/assets/images/projects',
							publicPath: '../../assets/images/projects/',
						}),
						alt: fields.text({ label: 'Alt Text' }),
						caption: fields.text({ label: 'Caption' }),
						metadata: fields.array(
							fields.object({
								key: fields.text({ label: 'Metadata Key (e.g. Tool)' }),
								value: fields.text({ label: 'Metadata Value' }),
							}),
							{
								label: 'Image Specs/Metadata',
								itemLabel: (props) => `${props.fields.key.value || 'Key'}: ${props.fields.value.value || 'Value'}`,
							}
						),
					}),
					{
						label: 'Gallery Images',
						itemLabel: (props) => props.fields.alt.value || 'Image',
					}
				),
				steps: fields.array(
					fields.object({
						src: fields.image({
							label: 'Step Image',
							directory: 'src/assets/images/projects',
							publicPath: '../../assets/images/projects/',
						}),
						alt: fields.text({ label: 'Alt Text' }),
						label: fields.text({ label: 'Step Description' }),
					}),
					{
						label: 'Project Steps',
						itemLabel: (props) => props.fields.label.value || 'Step',
					}
				),
				date: fields.date({ label: 'Publish Date' }),
				featured: fields.checkbox({ label: 'Featured Project', defaultValue: false }),
				tags: fields.array(fields.text({ label: 'Tag' }), {
					label: 'Tags',
					itemLabel: (props) => props.value,
				}),
				progress: fields.number({ label: 'Progress Percentage (0-100)' }),
				schemaType: fields.select({
					label: 'Schema.org Type',
					options: [
						{ label: 'Software Application', value: 'SoftwareApplication' },
						{ label: 'Creative Work', value: 'CreativeWork' },
					],
					defaultValue: 'CreativeWork',
				}),
				projectUrl: fields.text({ label: 'Project URL' }),
				keywords: fields.array(fields.text({ label: 'Keyword' }), {
					label: 'JSON-LD Keywords',
					itemLabel: (props) => props.value,
				}),
				appCategory: fields.text({ label: 'App Category' }),
				operatingSystem: fields.text({ label: 'Operating System' }),
				softwareVersion: fields.text({ label: 'Software Version' }),
				content: fields.markdoc({
					label: 'Content',
					options: {
						tags: {
							blueprintGallery: {
								label: 'Blueprint Gallery',
								schema: {
									items: {
										label: 'Images Source',
										type: 'array',
										// Markdoc lets us define the attributes for tags
									},
									label: {
										label: 'Section Label',
										type: 'string',
									},
								},
							},
						},
					},
				}),
			},
		}),
		recipes: collection({
			label: 'Recipes',
			slugField: 'title',
			path: 'src/content/recipes/*',
			format: { contentField: 'content' },
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				category: fields.select({
					label: 'Category',
					options: [
						{ label: 'Baking', value: 'baking' },
						{ label: 'Cooking', value: 'cooking' },
						{ label: 'Preservation', value: 'preservation' },
					],
					defaultValue: 'cooking',
				}),
				description: fields.text({ label: 'Description', multiline: true }),
				tags: fields.array(fields.text({ label: 'Tag' }), {
					label: 'Tags',
					itemLabel: (props) => props.value,
				}),
				prepTime: fields.text({ label: 'Prep Time (e.g. 15 mins)' }),
				cookTime: fields.text({ label: 'Cook Time (e.g. 45 mins)' }),
				servings: fields.number({ label: 'Servings' }),
				cuisine: fields.text({ label: 'Cuisine' }),
				ingredients: fields.array(fields.text({ label: 'Ingredient' }), {
					label: 'Structured Ingredients',
					itemLabel: (props) => props.value,
				}),
				instructions: fields.array(fields.text({ label: 'Instruction step' }), {
					label: 'Structured Instructions',
					itemLabel: (props) => props.value,
				}),
				image: fields.object({
					src: fields.image({
						label: 'Primary Image',
						directory: 'src/assets/images/recipes',
						publicPath: '../../assets/images/recipes/',
					}),
					alt: fields.text({ label: 'Alt Text' }),
				}),
				images: fields.array(
					fields.object({
						src: fields.image({
							label: 'Recipe Image',
							directory: 'src/assets/images/recipes',
							publicPath: '../../assets/images/recipes/',
						}),
						alt: fields.text({ label: 'Alt Text' }),
						caption: fields.text({ label: 'Caption' }),
					}),
					{
						label: 'Additional Recipe Images',
						itemLabel: (props) => props.fields.alt.value || 'Image',
					}
				),
				steps: fields.array(
					fields.object({
						src: fields.image({
							label: 'Instruction Step Image',
							directory: 'src/assets/images/recipes',
							publicPath: '../../assets/images/recipes/',
						}),
						alt: fields.text({ label: 'Alt Text' }),
						label: fields.text({ label: 'Step Label' }),
					}),
					{
						label: 'Visual Recipe Steps',
						itemLabel: (props) => props.fields.label.value || 'Step',
					}
				),
				date: fields.date({ label: 'Publish Date' }),
				featured: fields.checkbox({ label: 'Featured Recipe', defaultValue: false }),
				content: fields.markdoc({ label: 'Content' }),
			},
		}),
		posts: collection({
			label: 'Blog Posts',
			slugField: 'title',
			path: 'src/content/posts/*',
			format: { contentField: 'content' },
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				date: fields.date({ label: 'Publish Date' }),
				updatedDate: fields.date({ label: 'Updated Date' }),
				description: fields.text({ label: 'Description', multiline: true }),
				tags: fields.array(fields.text({ label: 'Tag' }), {
					label: 'Tags',
					itemLabel: (props) => props.value,
				}),
				draft: fields.checkbox({ label: 'Draft Post', defaultValue: false }),
				featured: fields.checkbox({ label: 'Featured Post', defaultValue: false }),
				relatedProjects: fields.array(
					fields.relationship({
						label: 'Related Project',
						collection: 'projects',
					}),
					{
						label: 'Related Projects',
						itemLabel: (props) => props.value || '',
					}
				),
				series: fields.relationship({
					label: 'Series Membership',
					collection: 'series',
				}),
				seriesOrder: fields.number({ label: 'Position in Series' }),
				heroImage: fields.object({
					src: fields.image({
						label: 'Hero Image',
						directory: 'src/assets/images/posts',
						publicPath: '../../assets/images/posts/',
					}),
					alt: fields.text({ label: 'Alt Text' }),
				}),
				content: fields.markdoc({ label: 'Content' }),
			},
		}),
		series: collection({
			label: 'Blog Series',
			slugField: 'title',
			path: 'src/content/series/*',
			format: { contentField: 'content' },
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				description: fields.text({ label: 'Description', multiline: true }),
				tags: fields.array(fields.text({ label: 'Tag' }), {
					label: 'Tags',
					itemLabel: (props) => props.value,
				}),
				coverImage: fields.object({
					src: fields.image({
						label: 'Cover Image',
						directory: 'src/assets/images/series',
						publicPath: '../../assets/images/series/',
					}),
					alt: fields.text({ label: 'Alt Text' }),
				}),
				content: fields.markdoc({ label: 'Content' }),
			},
		}),
		writing: collection({
			label: 'Legacy Writing',
			slugField: 'title',
			path: 'src/content/writing/*',
			format: { contentField: 'content' },
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				description: fields.text({ label: 'Description' }),
				date: fields.date({ label: 'Date' }),
				updatedDate: fields.date({ label: 'Updated Date' }),
				draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
				featured: fields.checkbox({ label: 'Featured', defaultValue: false }),
				tags: fields.array(fields.text({ label: 'Tag' }), {
					label: 'Tags',
					itemLabel: (props) => props.value,
				}),
				status: fields.text({ label: 'Status' }),
				category: fields.text({ label: 'Category' }),
				universe: fields.text({ label: 'Universe' }),
				coverImage: fields.object({
					src: fields.image({
						label: 'Cover Image',
						directory: 'src/assets/images/writing',
						publicPath: '../../assets/images/writing/',
					}),
					alt: fields.text({ label: 'Alt Text' }),
				}),
				heroImage: fields.object({
					src: fields.image({
						label: 'Hero Image',
						directory: 'src/assets/images/writing',
						publicPath: '../../assets/images/writing/',
					}),
					alt: fields.text({ label: 'Alt Text' }),
				}),
				content: fields.markdoc({ label: 'Content' }),
			},
		}),
	},
});
