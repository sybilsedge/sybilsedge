/**
 * BlueprintGallery — Interactive MDX image gallery island.
 *
 * Idle state:  A CSS-grid of blueprint thumbnails with cyan borders and a
 *              subtle scanline overlay.
 * Active state: Framer Motion expands the selected image into a full-screen
 *               lightbox with a technical metadata sidebar.
 *
 * Mount with client:visible so JavaScript only loads when the gallery
 * scrolls into view.
 *
 * Usage in MDX:
 *   import BlueprintGallery from '../../components/BlueprintGallery.tsx';
 *   <BlueprintGallery items={props.galleryItems} />
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

export interface BlueprintImage {
	/** Full-resolution image URL (use Astro-optimised src). */
	src: string;
	/** Optional thumbnail URL; falls back to `src`. */
	thumbSrc?: string;
	alt: string;
	width?: number;
	height?: number;
	title?: string;
	caption?: string;
	/** Arbitrary key/value pairs for the technical sidebar (e.g. "Oven: 475°F"). */
	metadata?: Record<string, string>;
}

interface Props {
	items: BlueprintImage[];
	/** Optional section label rendered above the grid. */
	label?: string;
}

// Scanline overlay — subtle repeating gradient for the "blueprint" aesthetic.
const SCANLINE =
	'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.015) 2px, rgba(0,255,255,0.015) 4px)';

export default function BlueprintGallery({ items, label }: Props) {
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const dialogRef = useRef<HTMLDivElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
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
		const prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('keydown', onKey);
			document.body.style.overflow = prevOverflow;
		};
	}, [isOpen, close, prev, next]);

	// Focus trap
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

	// Auto-focus close button on open
	useEffect(() => {
		if (isOpen) closeButtonRef.current?.focus();
	}, [isOpen]);

	if (items.length === 0) return null;

	const metadataEntries = current?.metadata
		? Object.entries(current.metadata)
		: [];

	return (
		<>
			{label && (
				<p className="mb-3 font-tech text-[10px] uppercase tracking-[0.2em] text-cyan-300/40">
					{label}
				</p>
			)}

			{/* ── Thumbnail grid ── */}
			<div
				className="grid grid-cols-2 gap-2 sm:grid-cols-3"
				role="list"
				aria-label="Blueprint image gallery"
			>
				{items.map((item, idx) => (
					<button
						key={idx}
						type="button"
						role="listitem"
						onClick={() => open(idx)}
						className="group relative aspect-video overflow-hidden rounded-md border border-cyan-300/35 bg-black/40"
						style={{ boxShadow: '0 0 24px rgba(0, 255, 255, 0.15)' }}
						aria-label={`Open ${item.title ?? item.alt} in lightbox`}
					>
						{/* Scanline overlay */}
						<div
							className="pointer-events-none absolute inset-0 z-10"
							style={{ backgroundImage: SCANLINE }}
						/>
						<img
							src={item.thumbSrc ?? item.src}
							alt={item.alt}
							width={item.width}
							height={item.height}
							loading="lazy"
							decoding="async"
							className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
						/>
						<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/35">
							<ZoomIn
								className="text-cyan-300 opacity-0 drop-shadow-lg transition-opacity group-hover:opacity-100"
								size={22}
								aria-hidden
							/>
						</div>
						{item.title && (
							<div className="absolute bottom-0 left-0 right-0 z-20 bg-black/60 px-2 py-1">
								<p className="truncate font-tech text-[9px] uppercase tracking-[0.12em] text-cyan-300/70">
									{item.title}
								</p>
							</div>
						)}
					</button>
				))}
			</div>

			{/* ── Lightbox ── */}
			<AnimatePresence>
				{isOpen && current && (
					<motion.div
						ref={dialogRef}
						role="dialog"
						aria-modal="true"
						aria-label={current.title ?? current.alt}
						className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 backdrop-blur-sm"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.18 }}
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
							className="absolute right-4 top-4 z-20 rounded-md p-2 text-cyan-300/70 transition-colors hover:bg-white/10 hover:text-cyan-100"
						>
							<X size={22} />
						</button>

						{/* Previous */}
						{items.length > 1 && (
							<button
								type="button"
								onClick={prev}
								aria-label="Previous image"
								className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-md p-2 text-cyan-300/70 transition-colors hover:bg-white/10 hover:text-cyan-100"
							>
								<ChevronLeft size={30} />
							</button>
						)}

						{/* Content area: image + optional sidebar */}
						<motion.div
							key={activeIndex}
							className="flex max-h-[92vh] max-w-[95vw] flex-col gap-4 px-12 md:flex-row md:items-start md:gap-6"
							initial={{ scale: 0.94, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.96, opacity: 0 }}
							transition={{ duration: 0.22, ease: 'easeOut' }}
						>
							{/* Main image */}
							<div className="flex flex-col items-center gap-3">
								<img
									src={current.src}
									alt={current.alt}
									width={current.width}
									height={current.height}
									loading="eager"
									decoding="sync"
									className="max-h-[75vh] max-w-full rounded-md object-contain"
									style={{ boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)' }}
								/>
								{(current.title || current.caption) && (
									<div className="text-center">
										{current.title && (
											<p className="font-orbitron text-sm uppercase tracking-[0.08em] text-cyan-100">
												{current.title}
											</p>
										)}
										{current.caption && (
											<p className="font-tech mt-1 text-xs text-cyan-300/60">
												{current.caption}
											</p>
										)}
									</div>
								)}
								{items.length > 1 && (
									<p className="font-tech text-xs text-cyan-300/35">
										{(activeIndex ?? 0) + 1} / {items.length}
									</p>
								)}
							</div>

							{/* Technical sidebar — only rendered when metadata exists */}
							{metadataEntries.length > 0 && (
								<aside
									className="w-full shrink-0 rounded-md border border-cyan-300/20 bg-black/60 p-4 md:w-52"
									style={{ boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)' }}
									aria-label="Technical specifications"
								>
									{/* Blueprint grid background on sidebar */}
									<div
										className="pointer-events-none relative overflow-hidden inset-0 rounded-md opacity-30"
										style={{
											backgroundImage:
												'linear-gradient(to right, #00ffff10 1px, transparent 1px), linear-gradient(to bottom, #00ffff10 1px, transparent 1px)',
											backgroundSize: '40px 40px',
										}}
									/>
									<p className="relative mb-3 font-tech text-[9px] uppercase tracking-[0.2em] text-cyan-300/40">
										Specs
									</p>
									<dl className="relative space-y-2">
										{metadataEntries.map(([key, val]) => (
											<div key={key}>
												<dt className="font-tech text-[9px] uppercase tracking-[0.15em] text-cyan-300/40">
													{key}
												</dt>
												<dd className="font-tech text-[11px] text-cyan-100/80">
													{val}
												</dd>
											</div>
										))}
									</dl>
								</aside>
							)}
						</motion.div>

						{/* Next */}
						{items.length > 1 && (
							<button
								type="button"
								onClick={next}
								aria-label="Next image"
								className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-md p-2 text-cyan-300/70 transition-colors hover:bg-white/10 hover:text-cyan-100"
							>
								<ChevronRight size={30} />
							</button>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
