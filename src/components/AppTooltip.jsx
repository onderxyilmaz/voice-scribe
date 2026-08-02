import React, { useState, cloneElement, isValidElement, useRef } from 'react';
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
  FloatingArrow,
  arrow,
  safePolygon,
  useMergeRefs
} from '@floating-ui/react';

/**
 * Portal-based tooltip that escapes overflow/sidebar clipping.
 *
 * @param {object} props
 * @param {React.ReactElement} props.children - Single element to wrap (button, etc.)
 * @param {React.ReactNode} props.content - Tooltip body
 * @param {'top'|'right'|'bottom'|'left'} [props.placement='right']
 * @param {number} [props.delay=220] - Open delay ms
 * @param {boolean} [props.disabled=false]
 */
export default function AppTooltip({
  children,
  content,
  placement = 'right',
  delay = 220,
  disabled = false
}) {
  const [open, setOpen] = useState(false);
  const arrowRef = useRef(null);

  const { refs, floatingStyles, context, isPositioned } = useFloating({
    open: disabled ? false : open,
    onOpenChange: (next) => {
      if (!disabled) setOpen(next);
    },
    placement,
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({ fallbackAxisSideDirection: 'start' }),
      shift({ padding: 8 }),
      arrow({ element: arrowRef })
    ]
  });

  const hover = useHover(context, {
    move: false,
    delay: { open: delay, close: 80 },
    handleClose: safePolygon({ buffer: 1 }),
    enabled: !disabled
  });
  const focus = useFocus(context, { enabled: !disabled });
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role
  ]);

  // Hooks must run unconditionally — merge refs after early content checks below
  const childRef = isValidElement(children) ? children.props.ref : null;
  const mergedRef = useMergeRefs([refs.setReference, childRef]);

  if (!isValidElement(children)) return children;

  const trigger = cloneElement(children, {
    ...getReferenceProps(children.props),
    ref: mergedRef
  });

  return (
    <>
      {trigger}
      {open && !disabled && content != null && content !== '' && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={{
              ...floatingStyles,
              // Wait for first position pass; never flash at (0,0)
              visibility: isPositioned ? 'visible' : 'hidden',
              opacity: isPositioned ? undefined : 0,
              pointerEvents: 'none'
            }}
            className={`app-tooltip${isPositioned ? ' app-tooltip-ready' : ''}`}
            {...getFloatingProps()}
          >
            {content}
            <FloatingArrow
              ref={arrowRef}
              context={context}
              className="app-tooltip-arrow"
              width={10}
              height={6}
            />
          </div>
        </FloatingPortal>
      )}
    </>
  );
}
