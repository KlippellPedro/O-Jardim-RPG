import { motion } from 'framer-motion';

export default function InteractiveModuleCard({ title, description, iconUrl }: { title: string, description: string, iconUrl: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      className="relative p-[1px] rounded-2xl bg-gradient-to-b from-primary/30 to-transparent overflow-hidden group cursor-pointer h-full"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
      
      <div className="relative h-full bg-surface backdrop-blur-md rounded-2xl p-6 flex flex-col items-start border border-white/5 hover:border-primary/30 transition-colors">
        <div className="mb-4">
          <img src={iconUrl} alt={title} className="w-12 h-12 object-contain filter drop-shadow-[0_0_15px_rgba(196,160,82,0.5)]" />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </motion.div>
  );
}
