'use client';

import Link from 'next/link';

import { ReactNode } from 'react';

interface OptimizedLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  [key: string]: any;
}

const OptimizedLink = ({ 
  href, 
  children, 
  className, 
  onClick, 
  replace = false,
  scroll = true,
  shallow = false,
  ...props 
}: OptimizedLinkProps) => {


  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (onClick) {
      onClick();
    }
    
          // Use direct navigation for better performance
      window.location.href = href;
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Link>
  );
};

export default OptimizedLink;

