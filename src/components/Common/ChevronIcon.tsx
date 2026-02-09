interface ChevronIconProps {
  expanded: boolean;
  className?: string;
  expandedClassName?: string;
}

function ChevronIcon({ expanded, className = '', expandedClassName = '' }: ChevronIconProps) {
  return (
    <svg
      className={`${className} ${expanded ? expandedClassName : ''}`}
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

export default ChevronIcon;
