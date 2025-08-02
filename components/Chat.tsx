'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, MessageCircle, X, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/app/components/ui/avatar';
import { Badge } from '@/app/components/ui/badge';
import { useSocket } from '@/context/socket-context';
import { useUserStore } from '@/store/userStore';
import { inter, outfit, jetBrainsMono } from '@/lib/font';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: number;
  userImage?: string;
  isAdmin?: boolean;
}

interface ChatProps {
  spaceId: string;
  className?: string;
  isOverlay?: boolean;
  onClose?: () => void;
}

export const Chat: React.FC<ChatProps> = ({ spaceId, className = '', isOverlay = false, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { sendMessage } = useSocket();
  const { user, isAdmin } = useUserStore();

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen || isOverlay) {
      scrollToBottom();
    }
  }, [messages, isOpen, isOverlay, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if ((isOpen || isOverlay) && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, isOverlay]);

  // Handle incoming chat messages
  useEffect(() => {
    const handleChatMessage = (event: CustomEvent) => {
      const { userId, username, message, timestamp, userImage, isAdmin } = event.detail;
      
      const newChatMessage: ChatMessage = {
        id: `${userId}-${timestamp}`,
        userId,
        username,
        message,
        timestamp,
        userImage,
        isAdmin
      };

      setMessages(prev => [...prev, newChatMessage]);
      
      // Only increment unread count if chat is closed and not in overlay mode
      if (!isOpen && !isOverlay) {
        setUnreadCount(prev => prev + 1);
      }
    };

    window.addEventListener('chat-message', handleChatMessage as EventListener);
    return () => window.removeEventListener('chat-message', handleChatMessage as EventListener);
  }, [isOpen, isOverlay]);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim() || !user) return;

    const messageData = {
      spaceId,
      userId: user.id,
      username: user.username || user.name,
      message: newMessage.trim(),
      userImage: user.imageUrl,
      isAdmin,
      timestamp: Date.now()
    };

    sendMessage('send-chat-message', messageData);
    setNewMessage('');
  }, [newMessage, user, spaceId, sendMessage, isAdmin]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const toggleChat = useCallback(() => {
    if (isOverlay && onClose) {
      onClose();
    } else {
      setIsOpen(prev => !prev);
      if (!isOpen) {
        setUnreadCount(0);
      }
    }
  }, [isOpen, isOverlay, onClose]);

  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, []);

  const getUserInitials = useCallback((username: string) => {
    return username.charAt(0).toUpperCase();
  }, []);

  // Render overlay mode
  if (isOverlay) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={`w-full h-full bg-gradient-to-br from-black/95 via-gray-900/95 to-black/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl flex flex-col relative overflow-hidden ${className}`}
      >
        {/* Gradient Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="absolute top-0 left-1/4 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Chat Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm"
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center"
            >
              <Users className="w-4 h-4 text-white" />
            </motion.div>
            <div>
              <h3 className={`font-bold text-xl text-white ${outfit.className}`}>
                Room Chat
              </h3>
              <p className={`text-xs text-gray-400 ${inter.className}`}>
                Connect with your room
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1">
              {messages.length}
            </Badge>
          </div>
          <Button
            onClick={toggleChat}
            variant="ghost"
            size="sm"
            className="p-2 h-auto text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
          >
            <X className="w-5 h-5" />
          </Button>
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 p-6 overflow-y-auto relative">
          <AnimatePresence mode="popLayout">
            <div className="space-y-4">
              {messages.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center text-gray-400 py-12"
                >
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  </motion.div>
                  <p className={`text-base ${inter.className}`}>
                    No messages yet. Start the conversation!
                  </p>
                </motion.div>
              ) : (
                messages.map((message, index) => {
                  const isCurrentUser = message.userId === user?.id;
                  
                  return (
                    <motion.div 
                      key={message.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.02 }}
                      className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-white/10">
                          <AvatarImage 
                            src={message.userImage} 
                            alt={message.username}
                            className="object-cover"
                          />
                          <AvatarFallback className={`
                            text-sm font-bold bg-gradient-to-br from-cyan-500 to-purple-500 text-white
                            ${outfit.className}
                          `}>
                            {getUserInitials(message.username)}
                          </AvatarFallback>
                        </Avatar>
                      </motion.div>

                      {/* Message Content */}
                      <div className={`flex-1 min-w-0 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                        <div className={`flex items-center gap-2 mb-2 ${isCurrentUser ? 'flex-row-reverse justify-start' : ''}`}>
                          <span className={`text-sm font-bold text-white truncate ${outfit.className}`}>
                            {isCurrentUser ? 'You' : message.username}
                          </span>
                          {message.isAdmin && (
                            <motion.div
                              whileHover={{ scale: 1.05 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 border-0 px-2 py-1 shadow-lg">
                                Admin
                              </Badge>
                            </motion.div>
                          )}
                          <span className={`text-xs text-gray-500 flex-shrink-0 ${jetBrainsMono.className}`}>
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                        <div className={`${isCurrentUser ? 'flex justify-end' : 'flex justify-start'}`}>
                          <motion.div
                            whileHover={{ scale: 1.02 }}
                            transition={{ duration: 0.2 }}
                            className={`
                              text-sm break-words px-4 py-3 rounded-2xl max-w-[80%] relative overflow-hidden
                              ${isCurrentUser 
                                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-cyan-500/20' 
                                : 'bg-gradient-to-r from-white/10 to-white/5 text-gray-200 border border-white/10'
                              }
                              ${inter.className}
                            `}
                          >
                            {isCurrentUser && (
                              <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/30 to-purple-600/30 rounded-2xl" />
                            )}
                            <span className="relative z-10">{message.message}</span>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>
          </AnimatePresence>
        </div>

        {/* Message Input */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 border-t border-white/10 bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-sm"
        >
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className={`
                  w-full bg-gradient-to-r from-white/10 to-white/5 border border-white/20 
                  focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20
                  text-white placeholder:text-gray-400 rounded-2xl px-5 py-3
                  transition-all duration-300 ${inter.className}
                `}
                maxLength={500}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                {newMessage.length}/500
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={`
                  px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-purple-500
                  hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50
                  disabled:cursor-not-allowed transition-all duration-300
                  shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40
                `}
              >
                <Send className="w-5 h-5" />
              </Button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Render normal mode with toggle button
  return (
    <div className={`relative ${className}`}>
      {/* Chat Toggle Button */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          onClick={toggleChat}
          className={`
            relative flex items-center gap-2 px-4 py-3 rounded-2xl
            bg-gradient-to-r from-black/60 to-gray-900/60 hover:from-black/70 hover:to-gray-900/70
            border border-white/20 hover:border-white/30 backdrop-blur-xl 
            transition-all duration-300 text-gray-200 hover:text-white
            shadow-lg hover:shadow-xl ${inter.className}
          `}
        >
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <MessageCircle className="w-5 h-5" />
          </motion.div>
          <span className="hidden sm:inline text-sm font-medium">Chat</span>
          
          {/* Unread Count Badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                <Badge className="absolute -top-2 -right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs min-w-[24px] h-6 rounded-full p-0 flex items-center justify-center border-2 border-black shadow-lg">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" 
              onClick={toggleChat} 
            />
            
            {/* Chat Container */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={`
                fixed md:absolute 
                bottom-0 md:bottom-full right-0 md:right-0 md:mb-4
                w-full sm:w-[90vw] md:w-80 lg:w-96 
                h-[85vh] sm:h-[80vh] md:h-[500px]
                bg-gradient-to-br from-black/95 via-gray-900/95 to-black/95 
                backdrop-blur-2xl border border-white/20 
                rounded-t-3xl sm:rounded-3xl md:rounded-3xl
                shadow-2xl z-50 flex flex-col overflow-hidden
                mx-auto sm:mx-4 md:mx-0
              `}
            >
              {/* Gradient Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />
              <div className="absolute top-0 left-1/4 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Chat Header */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative flex items-center justify-between p-4 sm:p-5 md:p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-white/10"
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="w-7 h-7 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center"
                  >
                    <Users className="w-3.5 h-3.5 text-white" />
                  </motion.div>
                  <div>
                    <h3 className={`font-bold text-lg text-white ${outfit.className}`}>
                      Room Chat
                    </h3>
                    <p className={`text-xs text-gray-400 ${inter.className}`}>
                      {messages.length} messages
                    </p>
                  </div>
                  <Badge className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-1 text-xs">
                    Live
                  </Badge>
                </div>
                <Button
                  onClick={toggleChat}
                  variant="ghost"
                  size="sm"
                  className="p-2 h-auto text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-300"
                >
                  <X className="w-5 h-5" />
                </Button>
              </motion.div>

              {/* Messages Area */}
              <div className="flex-1 p-4 sm:p-5 md:p-4 overflow-y-auto relative">
                <div className="space-y-3 sm:space-y-4">
                  {messages.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center text-gray-400 py-8 sm:py-12"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-30" />
                      </motion.div>
                      <p className={`text-sm sm:text-base ${inter.className}`}>
                        No messages yet. Start the conversation!
                      </p>
                    </motion.div>
                  ) : (
                    messages.map((message, index) => {
                      const isCurrentUser = message.userId === user?.id;
                      
                      return (
                        <motion.div 
                          key={message.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.02 }}
                          className={`flex gap-2 sm:gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                        >
                          {/* Avatar */}
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Avatar className="w-8 h-8 sm:w-9 sm:h-9 flex-shrink-0 ring-2 ring-white/10">
                              <AvatarImage 
                                src={message.userImage} 
                                alt={message.username}
                                className="object-cover"
                              />
                              <AvatarFallback className={`
                                text-xs sm:text-sm font-bold bg-gradient-to-br from-cyan-500 to-purple-500 text-white
                                ${outfit.className}
                              `}>
                                {getUserInitials(message.username)}
                              </AvatarFallback>
                            </Avatar>
                          </motion.div>

                          {/* Message Content */}
                          <div className={`flex-1 min-w-0 max-w-[85%] sm:max-w-[80%] ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                            <div className={`flex items-center gap-1.5 sm:gap-2 mb-1.5 ${isCurrentUser ? 'flex-row-reverse justify-start' : ''}`}>
                              <span className={`text-xs sm:text-sm font-bold text-white truncate ${outfit.className}`}>
                                {isCurrentUser ? 'You' : message.username}
                              </span>
                              {message.isAdmin && (
                                <motion.div
                                  whileHover={{ scale: 1.05 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Badge className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 border-0 px-1.5 py-0.5 shadow-sm">
                                    Admin
                                  </Badge>
                                </motion.div>
                              )}
                              <span className={`text-xs text-gray-500 flex-shrink-0 ${jetBrainsMono.className}`}>
                                {formatTime(message.timestamp)}
                              </span>
                            </div>
                            <div className={`${isCurrentUser ? 'flex justify-end' : 'flex justify-start'}`}>
                              <motion.div
                                whileHover={{ scale: 1.02 }}
                                transition={{ duration: 0.2 }}
                                className={`
                                  text-sm break-words px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl relative overflow-hidden
                                  ${isCurrentUser 
                                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-md shadow-cyan-500/20' 
                                    : 'bg-gradient-to-r from-white/10 to-white/5 text-gray-200 border border-white/10'
                                  }
                                  ${inter.className}
                                `}
                              >
                                {isCurrentUser && (
                                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/20 to-purple-600/20 rounded-xl sm:rounded-2xl" />
                                )}
                                <span className="relative z-10">{message.message}</span>
                              </motion.div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message Input */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-4 sm:p-5 md:p-4 border-t border-white/10 bg-gradient-to-r from-white/5 to-white/10"
              >
                <div className="flex gap-2 sm:gap-3">
                  <div className="flex-1 relative">
                    <Input
                      ref={inputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className={`
                        w-full bg-gradient-to-r from-white/10 to-white/5 border border-white/20 
                        focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20
                        text-white placeholder:text-gray-400 rounded-xl sm:rounded-2xl 
                        px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base
                        transition-all duration-300 ${inter.className}
                      `}
                      maxLength={500}
                    />
                    <div className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">
                      {newMessage.length}/500
                    </div>
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className={`
                        px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl 
                        bg-gradient-to-r from-cyan-500 to-purple-500
                        hover:from-cyan-400 hover:to-purple-400 disabled:opacity-50
                        disabled:cursor-not-allowed transition-all duration-300
                        shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40
                      `}
                    >
                      <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Chat;
