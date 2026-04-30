import CategoryBadge, { type LoreCategory } from './CategoryBadge';

export interface LoreEntryData {
	id: string;
	title: string;
	universe: string;
	category: LoreCategory;
}

interface Props {
	entry: LoreEntryData;
}

const arrowSvg = (
	<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
		<path d="M5 12h14" />
		<path d="m12 5 7 7-7 7" />
	</svg>
);

export default function LoreCard({ entry }: Props) {
	return (
		<a
			href={`/writing/lore/${entry.id}`}
			className="group blueprint-border rounded-md bg-black/35 p-5 flex flex-col gap-3 transition-shadow duration-200 hover:shadow-[0_0_20px_rgba(0,255,255,0.07)] hover:bg-black/50"
		>
			<div className="flex items-center justify-between gap-3">
				<h2 className="font-orbitron text-sm uppercase tracking-[0.1em] text-cyan-100 leading-tight group-hover:text-cyan-300 transition-colors">
					{entry.title}
				</h2>
				<CategoryBadge category={entry.category} />
			</div>

			<span className="font-tech text-[10px] uppercase tracking-[0.14em] text-primary/40">
				{entry.universe}
			</span>

			<div className="mt-auto flex items-center gap-1.5 font-tech text-[11px] uppercase tracking-[0.16em] text-primary/40 group-hover:text-accent/70 transition-colors">
				View Entry
				{arrowSvg}
			</div>
		</a>
	);
}
