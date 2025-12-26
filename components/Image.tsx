import React, { useState, useEffect } from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    fallback?: React.ReactNode;
}

export const Image: React.FC<ImageProps> = ({ src, alt, className, fallback, ...props }) => {
    const [error, setError] = useState(false);
    
    useEffect(() => {
        setError(false);
    }, [src]);

    if (error || !src) {
        return fallback ? <>{fallback}</> : (
            <div className={`flex items-center justify-center bg-slate-800 text-slate-600 ${className}`}>
                <ImageIcon size={20} />
            </div>
        );
    }

    return (
        <img 
            src={src} 
            alt={alt} 
            className={className}
            onError={() => setError(true)}
            loading="eager"
            decoding="sync"
            referrerPolicy="no-referrer"
            {...props}
        />
    );
};