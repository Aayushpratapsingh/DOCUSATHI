import { type ReactNode, useEffect, useRef, useState } from 'react'
import { m as motion, useInView, useReducedMotion } from 'motion/react'

type RevealProps = {
  children: ReactNode
  className?: string
  delay?: number
}

type FloatingCardProps = RevealProps & {
  distance?: number
  duration?: number
  pauseOnHover?: boolean
  pauseOnScroll?: boolean
}

export function FadeUp({ children, className, delay = 0 }: RevealProps) {
  const reducedMotion = useReducedMotion()
  return <motion.div
    className={className}
    initial={{ opacity: 0, y: reducedMotion ? 0 : 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.16 }}
    transition={{ duration: reducedMotion ? 0 : 0.65, ease: 'easeOut', delay: reducedMotion ? 0 : delay }}
  >{children}</motion.div>
}

export function StaggerContainer({ children, className, delay = 0.12 }: RevealProps) {
  const reducedMotion = useReducedMotion()
  return <motion.div
    className={className}
    initial="hidden"
    whileInView="visible"
    viewport={{ once: true, amount: 0.12 }}
    variants={{
      hidden: {},
      visible: { transition: { staggerChildren: reducedMotion ? 0 : delay } },
    }}
  >{children}</motion.div>
}

export function StaggerItem({ children, className }: Omit<RevealProps, 'delay'>) {
  const reducedMotion = useReducedMotion()
  return <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: reducedMotion ? 0 : 14 },
      visible: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.55, ease: 'easeOut' } },
    }}
  >{children}</motion.div>
}

export function FloatingCard({ children, className, delay = 0, distance = 9, duration = 5.2, pauseOnHover = false, pauseOnScroll = false }: FloatingCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { amount: 0.1 })
  const reducedMotion = useReducedMotion()
  const [isHovered, setIsHovered] = useState(false)
  const [scrollPaused, setScrollPaused] = useState(false)
  useEffect(() => {
    if (!pauseOnScroll) return
    const pause = () => setScrollPaused(true)
    window.addEventListener('scroll', pause, { passive: true })
    return () => window.removeEventListener('scroll', pause)
  }, [pauseOnScroll])
  useEffect(() => {
    if (!isInView) setScrollPaused(false)
  }, [isInView])
  const isFloating = isInView && !reducedMotion && !scrollPaused && !(pauseOnHover && isHovered)
  return <motion.div
    ref={ref}
    className={className}
    animate={isFloating ? { y: [0, -distance, 0], x: [0, 2, 0] } : { y: 0, x: 0 }}
    transition={{ duration: isFloating ? duration : reducedMotion ? 0 : 0.4, delay: isFloating ? delay : 0, repeat: isFloating ? Infinity : 0, ease: isFloating ? 'easeInOut' : 'easeOut' }}
    onHoverStart={pauseOnHover ? () => setIsHovered(true) : undefined}
    onHoverEnd={pauseOnHover ? () => setIsHovered(false) : undefined}
  >{children}</motion.div>
}
