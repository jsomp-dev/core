import React from 'react';

/**
 * Shadcn-standard class merging (adapted for zero-dependency)
 */
const cn = (...classes: any[]) => {
  return classes.filter(Boolean).join(' ');
};

export const Box = React.forwardRef<HTMLDivElement, any>((props, ref) => {
  const {className, ...rest} = props;
  return <div ref={ref} className={cn(className)} {...rest} />;
});
Box.displayName = 'Box';

export const Text = React.forwardRef<HTMLSpanElement, any>(({className, as: Component = 'span', ...props}, ref) => (
  <Component ref={ref} className={cn(className)} {...props} />
));
Text.displayName = 'Text';

/**
 * shadcn/ui Button (Complete implementation)
 */
export const Button = React.forwardRef<HTMLButtonElement, any>(({className, variant = 'default', size = 'default', ...props}, ref) => {
  const variants: any = {
    // Official shadcn zinc dark variants
    default: 'bg-zinc-50 text-zinc-950 shadow hover:bg-zinc-50/90',
    destructive: 'bg-red-900 text-zinc-50 shadow-sm hover:bg-red-900/90',
    outline: 'border border-zinc-800 bg-zinc-950 shadow-sm hover:bg-zinc-800 hover:text-zinc-50',
    secondary: 'bg-zinc-800 text-zinc-50 shadow-sm hover:bg-zinc-800/80',
    ghost: 'hover:bg-zinc-800 hover:text-zinc-50',
    link: 'text-zinc-50 underline-offset-4 hover:underline',
  };

  const sizes: any = {
    default: 'h-9 px-4 py-2',
    sm: 'h-8 rounded-md px-3 text-xs',
    lg: 'h-10 rounded-md px-8',
    icon: 'h-9 w-9',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  );
});
Button.displayName = 'Button';

/**
 * shadcn/ui Input (Complete implementation)
 */
export const Input = React.forwardRef<HTMLInputElement, any>(({className, type = 'text', ...props}, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        'flex h-9 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});
Input.displayName = 'Input';

export const Stack = React.forwardRef<HTMLDivElement, any>(({className, direction = 'col', gap = '2', align, justify, ...props}, ref) => {
  const directions: any = {
    row: 'flex-row',
    col: 'flex-col',
  };

  const gaps: any = {
    '0': 'gap-0',
    '1': 'gap-1',
    '2': 'gap-2',
    '3': 'gap-3',
    '4': 'gap-4',
    '5': 'gap-5',
    '6': 'gap-6',
    '8': 'gap-8',
    '10': 'gap-10',
  };

  const aligns: any = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
    baseline: 'items-baseline',
  };

  const justifies: any = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly',
  };

  return (
    <div
      ref={ref}
      className={cn(
        'flex',
        directions[direction] || 'flex-col',
        gaps[gap] || 'gap-2',
        align && (aligns[align] || `items-${align}`),
        justify && (justifies[justify] || `justify-${justify}`),
        className
      )}
      {...props}
    />
  );
});
Stack.displayName = 'Stack';

export const Image = React.forwardRef<HTMLImageElement, any>(({className, alt, ...props}, ref) => (
  <img ref={ref} className={cn('max-w-full h-auto', className)} alt={alt} {...props} />
));
Image.displayName = 'Image';
