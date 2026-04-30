export type LoreCategory = 'location' | 'faction' | 'technology' | 'history' | 'culture' | 'other';

interface Props {
	category: LoreCategory;
}

const config: Record<LoreCategory, { label: string; classes: string }> = {
	location:   { label: 'Location',   classes: 'border-amber-400/40 text-amber-400/80 bg-amber-400/5' },
	faction:    { label: 'Faction',    classes: 'border-rose-400/40 text-rose-400/80 bg-rose-400/5' },
	technology: { label: 'Technology', classes: 'border-primary/40 text-primary/80 bg-primary/5' },
	history:    { label: 'History',    classes: 'border-slate-400/40 text-slate-400/80 bg-slate-400/5' },
	culture:    { label: 'Culture',    classes: 'border-violet-400/40 text-violet-400/80 bg-violet-400/5' },
	other:      { label: 'Other',      classes: 'border-cyan-300/20 text-cyan-300/50 bg-transparent' },
};

export default function CategoryBadge({ category }: Props) {
	const { label, classes } = config[category] || config['other'];
	return (
		<span className={`rounded border font-tech text-[10px] uppercase tracking-[0.12em] px-2 py-0.5 ${classes}`}>
			{label}
		</span>
	);
}
