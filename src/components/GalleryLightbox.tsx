import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

export interface GalleryItem {
	/** Full-resolution URL shown inside the lightbox. */
	src: string;
	/** Smaller thumbnail URL shown in the grid; falls back to `src` if omitted. */
	thumbSrc?: string;
	alt: string;
	width?: number;
	height?: number;
	title?: string;
	caption?: string;
}

interface Props {
	items: GalleryItem[];
}

export default function GalleryLightbox({ items }: Props) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	// Tracks the thumbnail button that triggered the lightbox so focus can be
	// returned to it on close — required for keyboard/screen-reader users.
	const triggerRef = useRef<HTMLElement | null>(null);

	const isOpen = activeIndex !== null;
	const current = activeIndex !== null ? items[activeIndex] : null;

	const open = useCallback((idx: number) => {
		triggerRef.current = document.activeElement instanceof HTMLElement
			? document.activeElement
			: null;
		setActiveIndex(idx);
	}, []);

	const close = useCallback(() => {
		setActiveIndex(null);
		// Return focus to the thumbnail that opened the dialog.
		triggerRef.current?.focus();
		triggerRef.current = null;
	}, []);

	const prev = useCallback(
		() => setActiveIndex((i) => (i !== null ? (i - 1 + items.length) % items.length : null)),
		[items.length],
	);
	const next = useCallback(
		() => setActiveIndex((i) => (i !== null ? (i + 1) % items.length : null)),
		[items.length],
	);

	// Keyboard navigation and body scroll lock
	useEffect(() => {
		if (!isOpen) return;

		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') close();
			if (e.key === 'ArrowLeft') prev();
			if (e.key === 'ArrowRight') next();
		};

		// Capture the current overflow so we restore it exactly on close,
		// rather than unconditionally resetting to '' which could clobber
		// a pre-existing inline overflow value set elsewhere in the app.
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

	// Move focus to close button when dialog opens
	useEffect(() => {
		if (isOpen) closeButtonRef.current?.focus();
	}, [isOpen]);

	if (items.length === 0) return null;

	return (
		<>
			{/* Thumbnail grid */}
			<div
				className="grid grid-cols-2 gap-2 sm:grid-cols-3"
				role="list"
				aria-label="Image gallery"
			>
				{items.map((item, idx) => (
					<button
						key={idx}
						type="button"
						role="listitem"
						onClick={() => open(idx)}
						className="group relative aspect-video overflow-hidden rounded-md blueprint-border bg-black/40"
						aria-label={`Open ${item.title ?? item.alt} in lightbox`}
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
						<div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
							<ZoomIn
								className="text-white opacity-0 transition-opacity group-hover:opacity-100 drop-shadow-lg"
								size={24}
								aria-hidden
							/>
						</div>
					</button>
				))}
			</div>

			{/* Lightbox overlay */}
			{isOpen && current && (
				<div
					ref={dialogRef}
					role="dialog"
					aria-modal="true"
					aria-label={current.title ?? current.alt}
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
							aria-label="Previous image"
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
						{(current.title || current.caption) && (
							<div className="text-center">
								{current.title && (
									<p className="font-orbitron text-sm uppercase tracking-[0.08em] text-cyan-100">
										{current.title}
									</p>
								)}
								{current.caption && (
									<p className="font-tech mt-1 text-xs text-cyan-300/70">{current.caption}</p>
								)}
							</div>
						)}
						{items.length > 1 && (
							<p className="font-tech text-xs text-cyan-300/40">
								{(activeIndex ?? 0) + 1} / {items.length}
							</p>
						)}
					</div>

					{/* Next */}
					{items.length > 1 && (
						<button
							type="button"
							onClick={next}
							aria-label="Next image"
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
