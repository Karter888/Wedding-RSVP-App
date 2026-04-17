import { motion } from 'framer-motion'

export const SectionCard = ({ children, className = '', ...props }) => (
  <motion.section
    initial={{ opacity: 0, y: 12 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.2 }}
    transition={{ duration: 0.55 }}
    className={`rounded-2xl border border-rosewood/15 bg-white/80 p-6 shadow-soft backdrop-blur-sm ${className}`}
    {...props}
  >
    {children}
  </motion.section>
)
