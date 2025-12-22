import React, { useMemo, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaChevronRight, FaHome } from 'react-icons/fa';
import { buildBreadcrumbsFromRoute } from '../../utils/routeMap';
import '../../assets/css/breadcrumbs.css';

/**
 * Collapse breadcrumbs for mobile display
 * Shows: Home › ... › Current Page
 */
function collapseForMobile(items, isMobile) {
  if (!isMobile || items.length <= 3) return items;
  const first = items[0];
  const last = items[items.length - 1];
  return [first, { label: '…', isEllipsis: true }, last];
}

/**
 * Breadcrumbs Component
 * Dynamically builds navigation breadcrumbs based on current route or custom items
 * 
 * @param {Array} items - Optional custom breadcrumb items
 *   Format: [{ label: string, path: string | null, icon: Component, isEllipsis: boolean }]
 *   If path is null, item is non-clickable (current page)
 * 
 * @param {boolean} autoGenerate - Whether to auto-generate from route (default: true)
 * @param {string} currentLabel - Optional custom label for current page
 * @param {boolean} showHomeIcon - Show home icon instead of text (default: false)
 */
export default function Breadcrumbs({ 
  items = null, 
  autoGenerate = true, 
  currentLabel = null,
  showHomeIcon = false 
}) {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const derivedItems = useMemo(() => {
    // Use provided items or auto-generate from route
    let base;
    if (items && items.length > 0) {
      base = items;
    } else if (autoGenerate) {
      base = buildBreadcrumbsFromRoute(location.pathname, currentLabel);
    } else {
      base = [{ label: 'Home', path: '/' }];
    }
    
    return collapseForMobile(base, isMobile);
  }, [items, location.pathname, currentLabel, autoGenerate, isMobile]);

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol className="breadcrumbs-list">
        {derivedItems.map((item, index) => {
          const isLast = index === derivedItems.length - 1;
          const isLink = item.path && !isLast && !item.isEllipsis;
          const isHome = item.path === '/';
          const Icon = item.icon;

          return (
            <li className="breadcrumb-item" key={`${item.label}-${index}`}>
              {item.isEllipsis ? (
                <span className="breadcrumb-ellipsis" aria-hidden="true">…</span>
              ) : isLink ? (
                <Link to={item.path} className="breadcrumb-link" title={item.label}>
                  {Icon && <Icon className="breadcrumb-icon" />}
                  {isHome && showHomeIcon ? <FaHome className="breadcrumb-icon" /> : item.label}
                </Link>
              ) : (
                <span className="breadcrumb-current" aria-current="page">
                  {Icon && <Icon className="breadcrumb-icon" />}
                  {isHome && showHomeIcon ? <FaHome className="breadcrumb-icon" /> : item.label}
                </span>
              )}

              {!isLast && (
                <FaChevronRight className="breadcrumb-separator" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
