import { motion } from 'framer-motion';

export default function InteractiveModuleCard({ title, description, iconUrl }: { title: string, description: string, iconUrl: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      className="relative p-[1px] rounded-2xl bg-gradient-to-b from-primary/30 to-transparent overflow-hidden group cursor-pointer h-full"
    >
      <div className="absolute -inset-1 bg-gradient-to-br from-primary/0 via-primary/15 to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl pointer-events-none" />

      <div className="relative h-full bg-gradient-to-b from-white/[0.08] to-white/[0.03] backdrop-blur-md rounded-2xl p-6 flex flex-col items-start border border-white/10 group-hover:border-primary/30 transition-colors">
        <div className="mb-4">
          <img src={iconUrl} alt={title} className="w-12 h-12 object-contain filter drop-shadow-[0_0_15px_rgba(196,160,82,0.5)]" />
        </div>
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}
