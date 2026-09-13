import { defineMarkdocConfig, component } from '@astrojs/markdoc/config';

export default defineMarkdocConfig({
	tags: {
		blueprintGallery: {
			render: component('./src/components/BlueprintGalleryWrapper.astro'),
			attributes: {
				items: { type: Array },
				label: { type: String },
			},
		},
		youtube: {
			render: component('./src/components/YouTubeEmbed.astro'),
			attributes: {
				id: { type: String, required: true },
				title: { type: String },
			},
		},
	},
});
