/**
 * StepGallery — Ordered photo sequence gallery island.
 *
 * Displays a responsive grid of step-numbered thumbnails. Clicking a
 * thumbnail opens a full-screen lightbox with keyboard navigation.
 *
 * Use cases:
 *   - Kitchen posts: step-by-step recipe photos (e.g. "After first fold")
 *   - Project posts: progress / build evolution photos
 *
 * Usage in MDX:
 *   import StepGallery from '../../components/StepGallery.tsx';
 *   <StepGallery client:visible items={props.stepItems} label="Build Phases" />
 *
 * Mount with client:visible so JavaScript only loads when the gallery
 * scrolls into view.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

export interface StepItem {
	/** Full-resolution image URL (use Astro-optimised src). */
	src: string;
	/** Optional thumbnail URL; falls back to `src`. */
	thumbSrc?: string;
	alt: string;
	/** Optional plain-text step label shown as a caption overlay and in the lightbox. */
	label?: string;
	width?: number;
	height?: number;
}

interface Props {
	items: StepItem[];
	/** Optional section label rendered above the grid. */
	label?: string;
}

export default function StepGallery({ items, label }: Props) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	// Tracks the thumbnail that opened the lightbox so focus returns on close
	// — required for keyboard/screen-reader users.
	const triggerRef = useRef<HTMLElement | null>(null);

	const isOpen = activeIndex !== null;
	const current = activeIndex !== null ? items[activeIndex] : null;

	const open = useCallback((idx: number) => {
		triggerRef.current =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		setActiveIndex(idx);
	}, []);

	const close = useCallback(() => {
		setActiveIndex(null);
		triggerRef.current?.focus();
		triggerRef.current = null;
	}, []);

	const prev = useCallback(
		() =>
			setActiveIndex((i) =>
				i !== null ? (i - 1 + items.length) % items.length : null,
			),
		[items.length],
	);

	const next = useCallback(
		() =>
			setActiveIndex((i) =>
				i !== null ? (i + 1) % items.length : null,
			),
		[items.length],
	);

	// Keyboard navigation + body scroll lock
	useEffect(() => {
		if (!isOpen) return;

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
			if (e.key === 'ArrowLeft') prev();
			if (e.key === 'ArrowRight') next();
		};

		// Capture and restore the existing overflow so we don't clobber a
		// pre-existing inline overflow value set elsewhere in the app.
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', onKey);

		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [isOpen, close, prev, next]);

	// Focus trap inside the dialog
	useEffect(() => {
		if (!isOpen || !dialogRef.current) return;

		const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
		);
		const first = focusable[0];
		const last = focusable[focusable.length - 1];

		const trap = (e: KeyboardEvent) => {
			if (e.key !== 'Tab') return;
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first.focus();
				}
			}
		};

		document.addEventListener('keydown', trap);
		return () => document.removeEventListener('keydown', trap);
	}, [isOpen]);

	// Auto-focus close button when dialog opens
	useEffect(() => {
		if (isOpen) closeButtonRef.current?.focus();
	}, [isOpen]);

	if (items.length === 0) return null;

	return (
		<>
			{label && (
				<p className="mb-3 font-tech text-[10px] uppercase tracking-[0.2em] text-cyan-300/40">
					{label}
				</p>
			)}

			{/* ── Thumbnail grid ── */}
			<div
				className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
				role="list"
				aria-label={label ?? 'Step gallery'}
			>
				{items.map((item, idx) => (
					<button
						key={idx}
						type="button"
						role="listitem"
						onClick={() => open(idx)}
						className="group relative aspect-video overflow-hidden rounded-md border border-cyan-300/35 bg-black/40"
						aria-label={`Open step ${idx + 1}: ${item.alt}${item.label ? ` (${item.label})` : ''} in lightbox`}
					>
						<img
							src={item.thumbSrc ?? item.src}
							alt={item.alt}
							width={item.width}
							height={item.height}
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
						/>

						{/* Step number badge — top-left */}
						<div className="absolute left-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded border border-accent/40 bg-black/70">
							<span className="font-orbitron text-[8px] font-semibold leading-none text-accent/80">
								{idx + 1}
							</span>
						</div>

						{/* Hover zoom overlay */}
						<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
							<ZoomIn
								className="text-cyan-300 opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100"
								size={22}
								aria-hidden
							/>
						</div>

						{/* Label strip — bottom */}
						{item.label && (
							<div className="absolute bottom-0 left-0 right-0 z-20 bg-black/65 px-2 py-1">
								<p className="truncate font-tech text-[9px] uppercase tracking-[0.12em] text-cyan-300/70">
									{item.label}
								</p>
							</div>
						)}
					</button>
				))}
			</div>

			{/* ── Lightbox ── */}
			{isOpen && current && (
				<div
					ref={dialogRef}
					role="dialog"
					aria-modal="true"
					aria-label={`${current.label ?? current.alt} — Step ${(activeIndex ?? 0) + 1}`}
					className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
					onClick={(e) => {
						if (e.target === e.currentTarget) close();
					}}
				>
					{/* Close */}
					<button
						ref={closeButtonRef}
						type="button"
						onClick={close}
						aria-label="Close lightbox"
						className="absolute right-4 top-4 z-10 rounded-md p-2 text-cyan-300/70 transition-colors hover:bg-white/10 hover:text-cyan-100"
					>
						<X size={24} />
					</button>

					{/* Previous */}
					{items.length > 1 && (
						<button
							type="button"
							onClick={prev}
							aria-label="Previous step"
							className="absolute left-4 top-1/2 z-10 -translate-y-1/2 rounded-md p-2 text-cyan-300/70 transition-colors hover:bg-white/10 hover:text-cyan-100"
						>
							<ChevronLeft size={32} />
						</button>
					)}

					{/* Main image + caption */}
					<div className="flex max-h-[90vh] max-w-[90vw] flex-col items-center gap-3 px-16">
						<img
							src={current.src}
							alt={current.alt}
							width={current.width}
							height={current.height}
							loading="eager"
							decoding="sync"
							className="max-h-[80vh] max-w-full rounded-md object-contain"
						/>

						<div className="text-center">
							{/* Step counter */}
							<p className="font-tech text-[10px] uppercase tracking-[0.18em] text-cyan-300/40">
								Step {(activeIndex ?? 0) + 1} / {items.length}
							</p>
							{/* Optional label */}
							{current.label && (
								<p className="mt-1 font-orbitron text-sm uppercase tracking-[0.08em] text-cyan-100">
									{current.label}
								</p>
							)}
						</div>
					</div>

					{/* Next */}
					{items.length > 1 && (
						<button
							type="button"
							onClick={next}
							aria-label="Next step"
							className="absolute right-4 top-1/2 z-10 -translate-y-1/2 rounded-md p-2 text-cyan-300/70 transition-colors hover:bg-white/10 hover:text-cyan-100"
						>
							<ChevronRight size={32} />
						</button>
					)}
				</div>
			)}
		</>
	);
}
