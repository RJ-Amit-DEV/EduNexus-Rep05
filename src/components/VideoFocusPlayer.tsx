import React, { useState, useEffect } from 'react';
import { Play, Youtube, AlertCircle, Loader2, Search, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface Video {
  id: string;
  title: string;
  thumbnail: string;
}

const CURATED_ENGINEERING_VIDEOS: Video[] = [
  {
    id: '26QPDBe-NB8',
    title: 'Operating Systems Full Course | Complete OS Tutorial for Students',
    thumbnail: 'https://img.youtube.com/vi/26QPDBe-NB8/hqdefault.jpg'
  },
  {
    id: 'RBSGKlAnoiM',
    title: 'Data Structures & Algorithms in 2024 | Full Course & Visuals',
    thumbnail: 'https://img.youtube.com/vi/RBSGKlAnoiM/hqdefault.jpg'
  },
  {
    id: 'HXV3zeQKqGY',
    title: 'Database Management Systems (DBMS) - Complete University Course',
    thumbnail: 'https://img.youtube.com/vi/HXV3zeQKqGY/hqdefault.jpg'
  }
];

interface VideoFocusPlayerProps {
  subject?: string;
  topic?: string;
  className?: string;
}

export const VideoFocusPlayer: React.FC<VideoFocusPlayerProps> = ({ subject = "", topic = "", className }) => {
  const [videos, setVideos] = useState<Video[]>(CURATED_ENGINEERING_VIDEOS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const fetchVideos = async (query: string) => {
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch videos');
      }

      if (Array.isArray(data.videos) && data.videos.length > 0) {
        setVideos(data.videos);
      } else {
        setVideos(CURATED_ENGINEERING_VIDEOS);
      }
    } catch (err) {
      console.warn('YouTube API unavailable or unconfigured, using curated educational lectures:', err);
      // Graceful fallback: show curated engineering lectures rather than failing
      setVideos(CURATED_ENGINEERING_VIDEOS);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (subject) {
      const initialQuery = topic ? `${subject} ${topic} lecture` : `${subject} lecture`;
      setSearchQuery(initialQuery);
      fetchVideos(initialQuery);
    }
  }, [subject, topic]);

  const handleManualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      fetchVideos(searchQuery);
    }
  };

  return (
    <div className={cn("space-y-8 bg-slate-50/30 p-8 rounded-[40px] border border-slate-100", className)}>
      {/* Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-200">
            <Youtube size={24} />
          </div>
          <div>
            <h3 className="text-xl font-display font-black text-slate-900 tracking-tight">Video Focus Player</h3>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Top 3 Curated Lectures</p>
          </div>
        </div>

        <form onSubmit={handleManualSearch} className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for lectures..."
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500 transition-all shadow-sm"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Content Area */}
      <div className="min-h-[200px] relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <Loader2 className="w-10 h-10 text-rose-600 animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Analyzing YouTube Data...</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-4 p-6 bg-rose-50 rounded-3xl border border-rose-100 text-rose-600"
            >
              <AlertCircle size={24} />
              <div>
                <p className="font-black uppercase text-xs tracking-widest mb-1">Search Error</p>
                <p className="text-sm font-bold opacity-80">{error}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {videos.length > 0 ? (
                <div className="flex flex-col gap-4">
                  {videos.map((video, index) => (
                    <motion.div
                      key={video.id ? `${video.id}-${index}` : `video-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="group flex flex-col lg:flex-row gap-6 p-4 bg-white rounded-[32px] border border-slate-200 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-500/5 transition-all duration-500"
                    >
                      {/* Video Thumbnail/Iframe Container */}
                      <div className="w-full lg:w-[320px] aspect-video shrink-0 rounded-2xl overflow-hidden bg-slate-900 shadow-inner relative">
                        <iframe
                          src={`https://www.youtube.com/embed/${video.id}`}
                          title={video.title}
                          className="absolute inset-0 w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>

                      {/* Video Info */}
                      <div className="flex-1 flex flex-col justify-center py-2">
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <h4 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-rose-600 transition-colors line-clamp-2">
                            {video.title}
                          </h4>
                          <a 
                            href={`https://www.youtube.com/watch?v=${video.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all shrink-0"
                          >
                            <ExternalLink size={18} />
                          </a>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg">
                            Lecture 0{index + 1}
                          </span>
                          <span className="flex items-center gap-1.5 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-pulse" />
                            High Relevance
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-slate-400 font-bold italic">
                    {hasSearched ? "No videos found for this search." : "Enter a topic above to find relevant lectures."}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
