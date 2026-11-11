// Shared motion presets. Under reduced motion, <MotionConfig reducedMotion="user"> drops the
// transforms and only the fades remain.
export const EASE = [0.22, 1, 0.36, 1]

// Parent/child variants for staggered entrances.
export const stagger = (gap = 0.05, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
})

export const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}
