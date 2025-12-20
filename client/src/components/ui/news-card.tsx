import * as React from 'react';
import { cn } from '@/lib/utils';
import { GlassCard } from './glass-card';
import { ExternalLink, Calendar, Newspaper } from 'lucide-react';

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  url: string;
  imageUrl?: string;
  publishedAt: Date | string;
  category?: string;
}

export interface NewsCardProps {
  item: NewsItem;
  compact?: boolean;
  delay?: number;
  className?: string;
}

export function NewsCard({ item, compact = false, delay = 0, className }: NewsCardProps) {
  const publishedDate = new Date(item.publishedAt);
  const formattedDate = publishedDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  if (compact) {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'flex items-start gap-3 p-3 rounded-xl glass-subtle glass-hover animate-fade-in-up opacity-0',
          className
        )}
        style={{ animationDelay: `${delay * 50}ms`, animationFillMode: 'forwards' }}
      >
        <div className="p-2 rounded-lg bg-primary/10 text-primary flex-shrink-0">
          <Newspaper className="h-4 w-4" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span>{item.source}</span>
            <span>•</span>
            <span>{formattedDate}</span>
          </div>
        </div>
        
        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      </a>
    );
  }

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'block group animate-fade-in-up opacity-0',
        className
      )}
      style={{ animationDelay: `${delay * 50}ms`, animationFillMode: 'forwards' }}
    >
      <GlassCard hover padding="none" className="overflow-hidden">
        {/* Image */}
        {item.imageUrl ? (
          <div className="relative h-32 overflow-hidden">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {item.category && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-white">
                {item.category}
              </span>
            )}
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-primary/20 to-violet/20 flex items-center justify-center">
            <Newspaper className="h-10 w-10 text-primary/50" />
          </div>
        )}
        
        {/* Content */}
        <div className="p-4">
          <h4 className="text-sm font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </h4>
          
          {item.summary && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {item.summary}
            </p>
          )}
          
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <span className="text-xs font-medium text-muted-foreground">{item.source}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </GlassCard>
    </a>
  );
}

// News feed skeleton
export function NewsCardSkeleton({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl">
        <div className="skeleton h-8 w-8 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-4 w-full rounded" />
          <div className="skeleton h-3 w-24 rounded" />
        </div>
      </div>
    );
  }

  return (
    <GlassCard padding="none" className="overflow-hidden">
      <div className="skeleton h-32 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="flex justify-between pt-3 border-t border-border/50">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </div>
    </GlassCard>
  );
}

// News feed list component
export interface NewsFeedProps {
  items: NewsItem[];
  loading?: boolean;
  compact?: boolean;
  maxItems?: number;
  title?: string;
}

export function NewsFeed({ items, loading = false, compact = false, maxItems = 5, title }: NewsFeedProps) {
  const visibleItems = items.slice(0, maxItems);

  return (
    <div className="space-y-3">
      {title && (
        <h3 className="text-fluid-lg font-semibold text-foreground flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          {title}
        </h3>
      )}
      
      {loading ? (
        <div className={cn(
          compact ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        )}>
          {Array.from({ length: compact ? 4 : 3 }).map((_, i) => (
            <NewsCardSkeleton key={i} compact={compact} />
          ))}
        </div>
      ) : (
        <div className={cn(
          compact ? 'space-y-2' : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
        )}>
          {visibleItems.map((item, index) => (
            <NewsCard key={item.id} item={item} compact={compact} delay={index} />
          ))}
        </div>
      )}
      
      {!loading && items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Newspaper className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma notícia disponível</p>
        </div>
      )}
    </div>
  );
}










