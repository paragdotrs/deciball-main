'use client';

import { motion } from 'framer-motion';
import { jetBrainsMono } from '@/lib/font';
import FuzzyText from './ui/FuzzyText';

export const Trademark = () => {
  const handleClick = () => {
    window.open('https://zeusnotfound.tech', '_blank', 'noopener,noreferrer');
  };

  return (
    <motion.div
      className="fixed bottom-4 right-4 z-50 cursor-pointer"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 1, duration: 0.6, ease: "easeOut" }}
      onClick={handleClick}
    >
      <motion.div
        className="relative"
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        {/* Main container */}
        <motion.div
          className="relative bg-black/60 backdrop-blur-xl border border-white/20 rounded-xl px-3 py-2 shadow-2xl"
          style={{
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          {/* Text content */}
          <div className="relative">
            <motion.div
              className="flex items-center gap-2"
              initial={{ y: 5, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.4 }}
            >
              <motion.span
                className={`text-xs text-gray-300 ${jetBrainsMono.className} font-mono`}
              >
                Built by
              </motion.span>
              <div className=' p-2'>
                    <FuzzyText
                  fontSize="20px"
                  fontWeight={700}
                  color="#e5e7eb"
                  enableHover={false}
                  baseIntensity={0.15}
                >
                  Zeus Notfound
                </FuzzyText>      
              </div>
        
              {/* <div className="scale-50 origin-left">

              </div> */}
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
