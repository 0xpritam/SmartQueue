function IconLink({ href, icon, label }) {
  const isImage = typeof icon === 'string' && !icon.startsWith('/icons.svg');
  return (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {isImage ? (
          <img className="button-icon" src={icon} alt="" />
        ) : (
          <svg className="button-icon" role="presentation" aria-hidden="true">
            <use href={icon}></use>
          </svg>
        )}
        {label}
      </a>
    </li>
  );
}

export default IconLink;
