import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoreCard, { type LoreEntryData } from './writing/LoreCard';
import { type LoreCategory } from './writing/CategoryBadge';

interface Props {
	entries: LoreEntryData[];
	universes: string[];
}

const CATEGORIES_CONFIG: Record<LoreCategory, string> = {
	location: 'Location',
	faction: 'Faction',
	technology: 'Technology',
	history: 'History',
	culture: 'Culture',
	other: 'Other'
};

const CATEGORIES = Object.keys(CATEGORIES_CONFIG) as LoreCategory[];

export default function LoreFilter({ entries, universes }: Props) {
	const [activeCategory, setActiveCategory] = useState<LoreCategory | 'all'>('all');
	const [activeUniverse, setActiveUniverse] = useState<string | 'all'>('all');
	const isMounted = useRef(false);

	// Initial hydration from URL params
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const cat = params.get('category');
		const uni = params.get('universe');

		if (cat && (CATEGORIES as string[]).includes(cat)) {
			setActiveCategory(cat as LoreCategory);
		}
		if (uni && (universes.includes(uni) || uni === 'all')) {
			setActiveUniverse(uni);
		}
		isMounted.current = true;
	}, [universes]);

	// Update URL params when filters change (skip initial mount)
	useEffect(() => {
		if (!isMounted.current) return;

		const url = new URL(window.location.href);
		if (activeCategory === 'all') {
			url.searchParams.delete('category');
		} else {
			url.searchParams.set('category', activeCategory);
		}

		if (activeUniverse === 'all') {
			url.searchParams.delete('universe');
		} else {
			url.searchParams.set('universe', activeUniverse);
		}

		const newUrl = url.pathname + url.search;
		window.history.replaceState({}, '', newUrl);
	}, [activeCategory, activeUniverse]);

	const filteredEntries = useMemo(() => {
		return entries.filter((entry) => {
			const categoryMatch = activeCategory === 'all' || entry.category === activeCategory;
			const universeMatch = activeUniverse === 'all' || entry.universe === activeUniverse;
			return categoryMatch && universeMatch;
		});
	}, [entries, activeCategory, activeUniverse]);

	const bookOpenSvg = (
		<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
			<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
			<path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
		</svg>
	);

	const getButtonClasses = (isActive: boolean) =>
		`rounded blueprint-border px-4 py-1.5 font-tech text-[11px] uppercase tracking-[0.16em] transition-all ${
			isActive
				? 'bg-primary/20 border-primary/40 text-primary'
				: 'text-primary/60 hover:text-primary/90 hover:bg-primary/5'
		}`;

	return (
		<div className="space-y-8">
			{/* Filter Controls */}
			<div className="space-y-4">
				{/* Category Filter */}
				<div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
					<button
						onClick={() => setActiveCategory('all')}
						className={getButtonClasses(activeCategory === 'all')}
						aria-pressed={activeCategory === 'all'}
					>
						All
					</button>
					{CATEGORIES.map((cat) => (
						<button
							key={cat}
							onClick={() => setActiveCategory(cat)}
							className={getButtonClasses(activeCategory === cat)}
							aria-pressed={activeCategory === cat}
						>
							{CATEGORIES_CONFIG[cat]}
						</button>
					))}
				</div>

				{/* Universe Filter */}
				<div role="group" aria-label="Filter by universe" className="flex flex-wrap gap-2">
					<button
						onClick={() => setActiveUniverse('all')}
						className={getButtonClasses(activeUniverse === 'all')}
						aria-pressed={activeUniverse === 'all'}
					>
						All
					</button>
					{universes.map((u) => (
						<button
							key={u}
							onClick={() => setActiveUniverse(u)}
							className={getButtonClasses(activeUniverse === u)}
							aria-pressed={activeUniverse === u}
						>
							{u}
						</button>
					))}
				</div>
			</div>

			{/* Results Count (Screen Reader Only) */}
			<div className="sr-only" aria-live="polite">
				{filteredEntries.length} entries found for the current filters.
			</div>

			{/* Grid */}
			<motion.div
				layout
				className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
			>
				<AnimatePresence mode="popLayout">
					{filteredEntries.map((entry) => (
						<motion.div
							key={entry.id}
							layout
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							transition={{ duration: 0.2 }}
						>
							<LoreCard entry={entry} />
						</motion.div>
					))}
				</AnimatePresence>
			</motion.div>

			{/* Empty State */}
			{filteredEntries.length === 0 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="blueprint-border rounded-md bg-black/35 p-12 text-center"
				>
					<div className="mb-4 flex justify-center opacity-30 text-cyan-300">
						{bookOpenSvg}
					</div>
					<p className="font-orbitron text-sm uppercase tracking-[0.16em] text-cyan-300/50">
						// NO ENTRIES MATCH THIS FILTER
					</p>
					<p className="mt-2 font-tech text-[11px] text-slate-400/60">
						Try adjusting your filters or resetting to "All".
					</p>
				</motion.div>
			)}
		</div>
	);
}
