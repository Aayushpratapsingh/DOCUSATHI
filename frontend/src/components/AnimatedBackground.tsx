import { useEffect, useRef, useState, type RefObject } from 'react'
import { m as motion, useInView, useReducedMotion } from 'motion/react'

type BackgroundVariant = 'page' | 'hero' | 'cta'

function useAnimationActive(ref: RefObject<HTMLDivElement | null>) {
  const isInView = useInView(ref, { amount: 0.01 })
  const reducedMotion = useReducedMotion()
  const [pageVisible, setPageVisible] = useState(() => document.visibilityState === 'visible')

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [])

  return isInView && pageVisible && reducedMotion === false
}

function AuroraBlobs({ active, dark = false }: { active: boolean; dark?: boolean }) {
  const blobs = dark
    ? [
        { className: 'aurora-blob aurora-blob-green', duration: 25, delay: 0 },
        { className: 'aurora-blob aurora-blob-cream', duration: 29, delay: 2 },
      ]
    : [
        { className: 'aurora-blob aurora-blob-green', duration: 23, delay: 0 },
        { className: 'aurora-blob aurora-blob-cream', duration: 27, delay: 2 },
        { className: 'aurora-blob aurora-blob-amber', duration: 20, delay: 4 },
      ]

  return <div className={`animated-aurora${dark ? ' dark-aurora' : ''}`} aria-hidden="true">
    {blobs.map(blob => <motion.span
      key={blob.className}
      className={blob.className}
      animate={active ? {
        x: ['-3%', '5%', '-4%'],
        y: ['-2%', '4%', '-3%'],
        scaleX: [1, 1.12, 0.94],
        scaleY: [1, 0.93, 1.1],
        opacity: [0.46, 0.58, 0.42],
      } : { x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 0.48 }}
      transition={{
        duration: active ? blob.duration : 0,
        delay: active ? blob.delay : 0,
        repeat: active ? Infinity : 0,
        repeatType: 'mirror',
        ease: 'easeInOut',
      }}
    />)}
  </div>
}

function WaveLayers({ active, dark = false }: { active: boolean; dark?: boolean }) {
  const waves = dark
    ? [
        { className: 'ambient-wave ambient-wave-one', duration: 29, path: 'M0 92 C180 34 360 34 540 92 S900 150 1080 92 S1440 34 1620 92 S1980 150 2160 92 S2520 34 2700 92 S3060 150 3240 92 V260 H0Z' },
        { className: 'ambient-wave ambient-wave-two', duration: 37, path: 'M0 122 C220 176 420 68 640 122 S1060 176 1280 122 S1700 68 1920 122 S2340 176 2560 122 S2980 68 3200 122 V260 H0Z' },
        { className: 'ambient-wave ambient-wave-last', duration: 44, path: 'M0 150 C180 106 360 106 540 150 S900 194 1080 150 S1440 106 1620 150 S1980 194 2160 150 S2520 106 2700 150 S3060 194 3240 150 V260 H0Z' },
      ]
    : [
        { className: 'ambient-wave ambient-wave-one', duration: 27, path: 'M0 88 C180 30 360 30 540 88 S900 146 1080 88 S1440 30 1620 88 S1980 146 2160 88 S2520 30 2700 88 S3060 146 3240 88 V260 H0Z' },
        { className: 'ambient-wave ambient-wave-two', duration: 35, path: 'M0 120 C220 174 420 66 640 120 S1060 174 1280 120 S1700 66 1920 120 S2340 174 2560 120 S2980 66 3200 120 V260 H0Z' },
        { className: 'ambient-wave ambient-wave-last', duration: 43, path: 'M0 154 C180 110 360 110 540 154 S900 198 1080 154 S1440 110 1620 154 S1980 198 2160 154 S2520 110 2700 154 S3060 198 3240 154 V260 H0Z' },
      ]

  return <div className={`ambient-waves${dark ? ' dark-waves' : ''}`} aria-hidden="true">
    {waves.map(wave => <motion.div
      key={wave.className}
      className={`ambient-wave-track ${wave.className}`}
      animate={active ? { x: ['0%', '-50%'] } : { x: '0%' }}
      transition={{
        duration: active ? wave.duration : 0,
        repeat: active ? Infinity : 0,
        ease: 'linear',
      }}
    >
      {[0, 1].map(index => <svg key={index} viewBox="0 0 1440 260" preserveAspectRatio="none">
        <path d={wave.path} transform="scale(.45 1)" />
      </svg>)}
    </motion.div>)}
  </div>
}

export default function AnimatedBackground({ variant }: { variant: BackgroundVariant }) {
  const ref = useRef<HTMLDivElement>(null)
  const active = useAnimationActive(ref)
  const reducedMotion = useReducedMotion()

  if (variant === 'page') {
    return <div ref={ref} className="animated-background animated-background-page" aria-hidden="true">
      <AuroraBlobs active={active} />
      <div className="animated-grid" />
      <div className="animated-grain" />
      <div className="animated-page-wash" />
    </div>
  }

  const isCta = variant === 'cta'
  return <div
    ref={ref}
    className={`animated-background animated-background-${variant}${isCta ? ' dark-ambient' : ''}`}
    aria-hidden="true"
  >
    <AuroraBlobs active={active} dark={isCta} />
    {variant === 'hero' && reducedMotion === false && <div className="animated-spotlight" />}
    <WaveLayers active={active} dark={isCta} />
    <div className="animated-grain" />
  </div>
}
