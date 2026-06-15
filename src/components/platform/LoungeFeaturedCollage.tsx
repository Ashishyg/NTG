import type { FeaturedDeck } from "@core/contracts";

type Props = {
  deck: FeaturedDeck;
};

const BLEND_PANELS = [
  {
    className: "left-0 z-[1] w-[40%]",
    objectPosition: "60% center",
    mask: "linear-gradient(to right, #000 72%, transparent 100%)",
  },
  {
    className: "left-[28%] z-[2] w-[44%]",
    objectPosition: "center center",
    mask: "linear-gradient(to right, transparent 0%, #000 18%, #000 82%, transparent 100%)",
  },
  {
    className: "right-0 z-[1] w-[40%]",
    objectPosition: "40% center",
    mask: "linear-gradient(to left, #000 72%, transparent 100%)",
  },
] as const;

export default function LoungeFeaturedCollage({ deck }: Props) {
  const images = deck.images.slice(0, 3);
  const single = images.length === 1 ? images[0] : null;

  return (
    <div className="relative min-h-[16rem] overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-[#070b14] sm:aspect-[21/9] sm:min-h-[18rem]">
      {single ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={single.src}
            alt={single.alt}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
          />
        </>
      ) : images.length >= 3 ? (
        <div className="absolute inset-0" aria-hidden>
          {images.map((img, i) => {
            const panel = BLEND_PANELS[i];
            if (!panel) return null;

            return (
              <div
                key={img.src}
                className={`absolute inset-y-0 overflow-hidden ${panel.className}`}
                style={{
                  WebkitMaskImage: panel.mask,
                  maskImage: panel.mask,
                  WebkitMaskSize: "100% 100%",
                  maskSize: "100% 100%",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  className="h-full w-full scale-[1.03] object-cover brightness-[0.94] saturate-[1.12]"
                  style={{ objectPosition: panel.objectPosition }}
                  loading={i === 1 ? "eager" : "lazy"}
                />
              </div>
            );
          })}

          <div className="pointer-events-none absolute inset-0 z-[3] bg-gradient-to-r from-[#070b14]/30 via-transparent to-[#070b14]/30" />
          <div className="pointer-events-none absolute inset-0 z-[4] mix-blend-soft-light bg-gradient-to-br from-violet-900/25 via-transparent to-cyan-900/20" />
        </div>
      ) : (
        <div className="h-full w-full bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#070b14]" />
      )}

      <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-[#070b14] via-[#070b14]/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 z-30 p-6 sm:p-8">
        <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--color-brand)]">
          {deck.eyebrow}
        </p>
        <p className="mt-2 max-w-xl font-display text-2xl font-semibold text-white sm:text-3xl">
          {deck.title}
        </p>
        <p className="mt-2 max-w-lg text-sm text-white/55">{deck.subtitle}</p>
      </div>
    </div>
  );
}
