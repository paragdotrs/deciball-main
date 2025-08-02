'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Home, Plus } from 'lucide-react';
import { inter, outfit } from '@/lib/font';

interface SpaceEndedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateNewSpace: () => void;
  onGoHome: () => void;
  spaceName?: string;
  reason?: string;
  message?: string;
}

const SpaceEndedModal: React.FC<SpaceEndedModalProps> = ({
  isOpen,
  onClose,
  onCreateNewSpace,
  onGoHome,
  spaceName,
  reason = 'admin-left',
  message = 'The space admin has left. You can create a new space or join another one.'
}) => {
  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ 
              type: "spring", 
              duration: 0.4,
              bounce: 0.25
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gradient-to-br from-[#1a1b23] via-[#1e1f28] to-[#22232e] border border-[#2a2b36] rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              {/* Header */}
              <div className="relative p-6 pb-4">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
                
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                    <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <h2 className={`text-xl font-semibold text-white ${outfit.className}`}>
                      Space Ended
                    </h2>
                    {spaceName && (
                      <p className={`text-sm text-gray-400 ${inter.className}`}>
                        "{spaceName}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                <div className="mb-6">
                  <p className={`text-gray-300 leading-relaxed ${inter.className}`}>
                    {message}
                  </p>
                  
                  {reason === 'admin-left' && (
                    <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className={`text-sm text-red-200 ${inter.className}`}>
                        <span className="font-medium">Admin disconnected:</span> The space creator has left and the session has ended.
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onCreateNewSpace}
                    className={`w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${outfit.className}`}
                  >
                    <Plus size={18} />
                    Create New Space
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onGoHome}
                    className={`w-full bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${outfit.className}`}
                  >
                    <Home size={18} />
                    Go to Dashboard
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SpaceEndedModal;
