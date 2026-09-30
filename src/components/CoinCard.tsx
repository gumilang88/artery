'use client';

import { cn } from '@/lib/utils';
import type { Coin } from '@/lib/data';

export function CoinCard({ coin }: { coin: Coin }) {
  return (
    <a className='flex flex-col gap-y-2 w-full group'>
      <div className='relative flex aspect-[3/2] w-full cursor-pointer overflow-hidden rounded-[12px] transition-transform group-hover:scale-[1.025]'>
        <img
          src={coin.image}
          alt={coin.name}
          className='aspect-square h-full w-full rounded-[12px] object-cover'
          loading='lazy'
        />
        <div
          className='absolute bottom-0 left-0 w-full px-3 pb-3 pt-12'
          style={{
            background:
              'linear-gradient(180deg,rgba(0,0,0,0) 0%,rgba(0,0,0,0.08) 30%,rgba(0,0,0,0.4) 60%,rgba(0,0,0,0.85) 100%)',
          }}
        >
          <div className='flex items-center justify-between'>
            <div className='inline-block rounded-sm font-bold text-lg text-white'>
              {coin.mc}
            </div>
            {coin.live && (
              <div className={cn('live-badge rounded px-1.5 py-0.5 text-[10px] font-bold text-white')}>
                LIVE
              </div>
            )}
          </div>
          <div className='flex items-end gap-x-1.5'>
            <p className='truncate font-medium text-base text-white'>{coin.name}</p>
            <p className='mb-px truncate text-sm text-white/70'>{coin.ticker}</p>
          </div>
        </div>
      </div>
      <p className='w-full line-clamp-2 text-sm text-text-tertiary text-left'>
        {coin.description || ' '}
      </p>
    </a>
  );
}