import { cn } from '@/lib/utils';

interface LogoProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    showText?: boolean;
}

const sizeMap = {
    sm: { svg: 20, text: 'text-sm' },
    md: { svg: 28, text: 'text-base' },
    lg: { svg: 36, text: 'text-lg' },
};

export function Logo({ className, size = 'md', showText = true }: LogoProps) {
    const { svg, text } = sizeMap[size];
    
    return (
        <div className={cn('flex items-center gap-1', className)}>
            <div className="relative inline-flex items-center justify-center">
                <svg 
                    width={svg} 
                    height={svg} 
                    viewBox="0 0 32 32" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="drop-shadow-sm"
                >
                    <defs>
                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8b5cf6"/>
                            <stop offset="100%" stopColor="#ec4899"/>
                        </linearGradient>
                    </defs>
                    <rect x="4" y="4" width="24" height="24" rx="6" fill="url(#logoGradient)" opacity="0.1"/>
                    <rect x="4" y="4" width="24" height="24" rx="6" fill="none" stroke="url(#logoGradient)" strokeWidth="1.5"/>
                    <polygon points="16,8 22,14 16,20 10,14" fill="url(#logoGradient)"/>
                </svg>
            </div>
            {showText && (
                <div className="flex flex-col">
                    <span className={cn('font-bold tracking-tighter bg-linear-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent', text)}>
                        Invo
                    </span>
                </div>
            )}
        </div>
    );
}
